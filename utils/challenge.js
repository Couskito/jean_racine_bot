const { MessageEmbed } = require('discord.js')
const { DateTime } = require('luxon')

module.exports = {
	challengeInfo: function(args = {}) {
		return {
			id: this.id_challenge || args.id_challenge,
			title: this.titre || args.titre || this.id_challenge || args.id_challenge,
			description: this.soustitre || args.soustitre,
			score: this.score || args.score || 0,
			rubrique: this.rubrique || args.rubrique,
			date: this.date_publication || args.date_publication,
			url: this.url_challenge || args.url_challenge,
			authors: (this.auteurs && this.auteurs.length
				? this.auteurs.map(v => v.nom).join(',')
				: undefined)
					|| (args.auteurs && args.auteurs.length
						? args.auteurs.map(v => v.nom).join(',')
						: undefined),
			validations: this.validations || args.validations,
			difficulty: this.difficulte || args.difficulte,
			timestamp: this.timestamp || args.timestamp
		}
	},
	challengeEmbed: function(u) {
		const embed = new MessageEmbed()
			.setTitle('**Challenge :** ' + (u.title || u.id_challenge))
			.setDescription(u.description || 'Aucune description')

		if (u.authors != null && u.authors !== '') embed.setAuthor(u.authors)
		if (u.validations != null && u.validations !== '') embed.addField('Validations', u.validations.toString())
		if (u.rubrique != null && u.rubrique !== '') embed.addField('Catégorie', u.rubrique.toString(), true)
		if (u.difficulty != null && u.difficulty !== '') embed.addField('Difficulté', u.difficulty.toString(), true)
		if (u.score != null && u.score !== '') embed.addField('Score', u.score.toString(), true)
		if (u.url != null && u.url !== '') embed.setURL(`${process.env.ROOTME_URL}/${u.url}`)
		if (u.backup) embed.setFooter('⚠️ Sauvegarde locale du ' + (DateTime.fromJSDate(u.timestamp).setLocale('fr').toLocaleString(DateTime.DATETIME_MED)))

		return embed
	}
}
