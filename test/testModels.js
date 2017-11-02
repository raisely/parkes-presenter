const Sequelize = require('sequelize');

const sequelize = function testDB() {
	return new Sequelize('parkesPresenterTest', 'parkes-test', 'parkes-password', {
		dialect: 'sqlite',
	});
};

sequelize.define('user', {
	uuid: Sequelize.STRING,
	key: Sequelize.STRING,
	name: Sequelize.STRING,
	role: Sequelize.STRING,
});
Object.assign(sequelize.models.user, {
	publicAttributes: ['uuid', 'key', 'name'],
	privateAttributes: ['role'],
	nestedModels: ['posts', 'team'],
});

sequelize.define('post', {
	uuid: Sequelize.STRING,
	key: Sequelize.STRING,
	title: Sequelize.STRING,
	body: Sequelize.STRING,
	followers: Sequelize.INTEGER,
});
Object.assign(sequelize.models.post, {
	publicAttributes: ['uuid', 'key', 'title', 'body'],
	privateAttributes: ['follows'],
	nestedModels: [{ attribute: 'user', rename: 'author' }],
});

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

async function init() {
	await sequelize.sync({ force: true });

	// This can all happen in parallel
	await sequelize.models.post.create({
		title: 'The Defining Moment of our Times',
		followers: 11000,
		uuid: 'uuid_for_post',
		key: 'key_for_post',
		user: {
			name: 'Bill Ryan',
			role: 'Veteran',
			uuid: 'uuid_for_bill',
			key: 'key_for_bill',
			team: {
				name: 'Generations',
				secretPower: 'people',
				uuid: 'uuid_for_team',
				key: 'key_for_team',
			},
		},
	});
}

module.exports = {
	init,
	models: sequelize.models,
};
