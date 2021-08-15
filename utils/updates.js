const mongoose = require('../utils/mongoose')
const axios = require('axios')
const { MessageEmbed } = require('discord.js')
const logger = require('../utils/signale')
const { DateTime } = require('luxon')
const { challengeEmbed, challengeInfo } = require('../utils/challenge')

module.exports = {
  pause: async function(time = 2000) {
    await new Promise(r => setTimeout(r, time))
  },
  fetchChallenges: async function(client, channelIds) {
    logger.info('Fetch and update challenges')
    let fetchContinue = true
    let index = 0
    while (fetchContinue) {
      const req = await axios.get(`${process.env.ROOTME_API_URL}/challenges?debut_challenges=${index * 50}&${new Date().getTime()}`,
        { headers: { Cookie: `api_key=${process.env.API_KEY}` } })

      const pages = Object.keys(req.data[0]).map(v => req.data[0][v])

      for (const page of pages) {
        let ret
        const f = await mongoose.models.challenge.findOne({ id_challenge: page.id_challenge })
        const reqPage = await axios.get(`${process.env.ROOTME_API_URL}/challenges/${page.id_challenge}?${new Date().getTime()}`,
          { headers: { Cookie: `api_key=${process.env.API_KEY}` } })
        reqPage.data.timestamp = new Date()

        if (f) {
          ret = await mongoose.models.challenge.updateOne({ id_challenge: page.id_challenge }, reqPage.data)
        } else {
          reqPage.data.id_challenge = page.id_challenge
          ret = await mongoose.models.challenge.create(reqPage.data)

          if (client && channelIds) {
            for (const channel of channelIds) await client.channels.cache.get(channel).send({ embeds: [challengeEmbed(challengeInfo(reqPage.data))] })
          }
        }
        logger.log(page.id_challenge + ' > ' + reqPage.data.titre + (ret.nModified || ret._id ? '*' : ''))
        await this.pause()
      }

      await this.pause()
      if (req.data?.[1]?.rel !== 'next' && req.data?.[2]?.rel !== 'next') fetchContinue = false
      index++
    }
  },
  updateUsers: async function(client, channelIds) {
    logger.info('Update users')
    for await (const user of mongoose.models.user.find()) {
      try {
        const req = await axios.get(`${process.env.ROOTME_API_URL}/auteurs/${user.id_auteur}?${new Date().getTime()}`,
          { headers: { Cookie: `api_key=${process.env.API_KEY}` } })

        const toCheck = [
          {
            key: 'validations',
            id: 'id_challenge',
            value: 'date',
            title: 'Nouveaux challenges validés par '
          },
          {
            key: 'solutions',
            id: 'id_solution',
            value: 'url_solution',
            title: 'Nouvelles solutions ajoutées par '
          },
          {
            key: 'challenges',
            id: 'id_challenge',
            value: 'url_challenge',
            title: 'Nouveaux challenges créés par '
          }
        ]

        if (client && channelIds) {
          for (const element of toCheck) {
            if (req.data[element.key] && req.data[element.key].length) {
              const oldValues = (user[element.key] || []).map(v => v[element.id])
              const _oldSet = new Set(oldValues)
              const newValues = (req.data[element.key] || []).map(v => v[element.id])
              const newValidationElements = (req.data[element.key] || []).reduce((obj, item) => (obj[item[element.id]] = item[element.value], obj), {})
              const _newSet = new Set(newValues)
              const intersect = [...new Set([..._oldSet].filter(x => _newSet.has(x)))]
              const increased = []

              newValues.forEach((item) => {
                if (intersect.indexOf(item) === -1) increased.push(item)
              })

              if (increased.length) {
                const embed = new MessageEmbed()
                  .setTitle(element.title + user.nom)
                  .setThumbnail(`${process.env.ROOTME_URL}/IMG/auton${user.id_auteur}.jpg`)

                for (const [i, v] of increased.entries()) {
                  let chall = undefined
                  if (element.value === 'date') chall = await mongoose.models.challenge.findOne({ [element.id]: Number(v) })
                  embed.addField((i + 1) + '. ' + (chall && chall.titre ? chall.titre.toString() : v.toString()),
                    element.value === 'date'
                      ? (DateTime.fromSQL(newValidationElements[v]).setLocale('fr').toLocaleString(DateTime.DATETIME_MED) || 'Aucune date')
                      : `[Lien direct](${process.env.ROOTME_URL}/${newValidationElements[v].toString()})`
                  )
                }

                const channelsIdsFiltered = (await mongoose.models.channels.find({ users: user.id_auteur })).map(v => v.channelId)
                for (const channel of channelsIdsFiltered) await client.channels.cache.get(channel).send({ embeds: [embed] })
              }
            }
          }
        }

        req.data.timestamp = new Date()
        const update = await mongoose.models.user.updateOne({ id_auteur: req.data.id_auteur }, req.data, { runValidators: true }) // Update user in database
        await this.pause()
        logger.success('User ', update)
      } catch (err) {
        logger.error(err)
      }
    }
  }
}
