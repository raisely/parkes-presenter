const Sequelize = require('sequelize');

function defineUser(sequelize) {
	sequelize.define('user', {
		uuid: Sequelize.STRING,
		key: Sequelize.STRING,
		name: Sequelize.STRING,
		role: Sequelize.STRING,
		bio: Sequelize.STRING,
	});
	Object.assign(sequelize.models.user, {
		publicAttributes: ['uuid', 'key', 'name', 'bio', 'teamUuid', 'teamKey'],
		privateAttributes: ['role'],
		nestedModels: ['posts', 'team'],
	});
	sequelize.models.user.associate = (m) => {
		m.user.belongsTo(m.team);
		m.user.hasMany(m.post);
		m.user.hasMany(m.comment);
	};
}

function definePost(sequelize) {
	sequelize.define('post', {
		uuid: Sequelize.STRING,
		key: Sequelize.STRING,
		title: Sequelize.STRING,
		body: Sequelize.STRING,
		followers: Sequelize.INTEGER,
	});
	Object.assign(sequelize.models.post, {
		publicAttributes: ['uuid', 'key', 'title', 'body', 'authorUuid', 'authorKey'],
		privateAttributes: ['followers'],
		nestedModels: [{ association: 'user', rename: 'author' }],
	});
	sequelize.models.post.associate = (m) => {
		m.post.belongsTo(m.user);
	};
}

function defineTeam(sequelize) {
	sequelize.define('team', {
		uuid: Sequelize.STRING,
		key: Sequelize.STRING,
		name: Sequelize.STRING,
		secretPower: Sequelize.STRING,
	});
	Object.assign(sequelize.models.team, {
		publicAttributes: ['uuid', 'key', 'name'],
		privateAttributes: ['secretPower'],
		nestedModels: ['user'],
	});
	sequelize.models.team.associate = (m) => {
		m.team.hasMany(m.user);
	};
}

function defineComment(sequelize) {
	sequelize.define('comment', {
		uuid: Sequelize.STRING,
		key: Sequelize.STRING,
		body: Sequelize.STRING,
	});
	Object.assign(sequelize.models.comment, {
		publicAttributes: ['uuid', 'key', 'name'],
		privateAttributes: [],
		nestedModels: {
			public: ['post'],
			private: ['user'],
		},
	});
	sequelize.models.comment.associate = (m) => {
		m.comment.belongsTo(m.user);
		m.comment.belongsTo(m.post);
	};
}

function configureDb() {
	const sequelize = new Sequelize('parkesPresenterTest', 'parkes-test', 'parkes-password', {
		dialect: 'sqlite',
		operatorsAliases: false,
		logging: false,
	});

	defineUser(sequelize);
	definePost(sequelize);
	defineTeam(sequelize);
	defineComment(sequelize);

	Object.keys(sequelize.models).forEach((name) => {
		if (sequelize.models[name].associate) {
			sequelize.models[name].associate(sequelize.models);
		}
	});

	return sequelize;
}

function defineInit(sequelize) {
	return async function init() {
		await sequelize.sync({ force: true });

		const team = await sequelize.models.team.create({
			name: 'Generations',
			secretPower: 'people',
			uuid: 'uuid_for_team',
			key: 'key_for_team',
		});

		const user = await sequelize.models.user.create({
			name: 'Bill Ryan',
			role: 'Veteran',
			uuid: 'uuid_for_bill',
			key: 'key_for_bill',
			teamId: team.id,
		});

		await sequelize.models.post.create({
			title: 'The Defining Moment of our Times',
			followers: 11000,
			uuid: 'uuid_for_post',
			key: 'key_for_post',
			userId: user.id,
		});

		await sequelize.models.comment.create({
			uuid: 'uuid_for_comment',
			key: 'key_for_comment',
			body: 'I say, I say, I say',
			userId: user.id,
		});
	};
}

const sequelize = configureDb();

module.exports = {
	init: defineInit(sequelize),
	sequelize,
	models: sequelize.models,
};
