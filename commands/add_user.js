const { SlashCommandBuilder } = require('@discordjs/builders')
const mongoose = require('../utils/mongoose')
const axios = require('../utils/axios')
const logger = require('../utils/signale')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adduser')
    .setDescription('Ajouter un utilisateur (id)')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Identifiant de l\'utilisateur')
        .setRequired(true)),

  async execute(interaction) {
    const guild = await mongoose.models.channels.findOne({ guildId: interaction.guildId })

    if (!guild)
      return await interaction.reply({ content: ':no_entry_sign: Pas la permission dans ce discord ! (**/init**)', ephemeral: true })

    let req
    const id = interaction.options.getString('id') // ID
    let user = await mongoose.models.user.findOne({ id_auteur: id })
    if (!user) {
      try {
        req = await axios.get(`/auteurs/${id}`, { params: { fakeHash: new Date().getTime() } })
        req.data.timestamp = new Date()
        await mongoose.models.user.create(req.data)
        user = await mongoose.models.user.findOne({ id_auteur: id })
      } catch (err) {
        logger.error(err)
        return await interaction.reply({ content: ':no_entry_sign: Utilisateur inexistant !', ephemeral: true })
      }
    }

    if (!(guild.users || []).includes(user.id_auteur)) {
      guild.users.push(user.id_auteur)
      await guild.save()
      return await interaction.reply(`:white_check_mark: Utilisateur ${user.nom} (${user.id_auteur}) ajouté avec succès`)
    } else {
      return await interaction.reply({ content: ':no_entry_sign: Utilisateur déjà présent ici !', ephemeral: true })
    }
  }
}

