const Presenter = require('../');
const testDb = require('./testModels');
const chai = require('chai');
const { chaiSubset } = require('chai-subset');
const _ = require('lodash');

const { models } = testDb;
const { expect } = chai;

chai.use(chaiSubset);

describe('jsonPresenter', () => {
	let user;
	let json;
	let presentationKey = 'uuid';
	const expectedUser = { name: 'Bill Ryan', role: 'Veteran' };

	before(async () => {
		Presenter.extendModels(models);
		await testDb.init();
	});

	beforeEach(async () => {
		user = await models.user.findOne();
	});

	describe('present', () => {
		beforeEach(() => {
			json = user.present(models.user.publicAttributes, {
				include: models.user.constructor.nestedModels,
			});
		});

		it('copies in attributes', () => {
			expect(json).to.containSubset(expectedUser);
		});

		it('defines null attributes', () => {
			expect(json).to.have.all.keys('bio');
		});

		function checkForeignKeys() {
			it('populates public foreign keys', () => {
				const key = `team${_.capitalize(presentationKey)}`;
				expect(user[key]).to.equal(`${presentationKey}_for_team`);
			});
			it('populates renamed nested models', () => {
				const key = `author${_.capitalize(presentationKey)}`;
				expect(user.posts[0][key]).to.equal(`${presentationKey}_for_user`);
			});
		}

		context('nested models', () => {
			it('includes nested model', () => {
				expect(json.team).to.containSubset({ name: 'Generations' });
			});

			it('includes nested collection', () => {
				expect(json.posts).to.containSubset([{ title: 'The Defining Moment of our Times' }]);
			});

			it('renames nested models', async () => {
				const post = await models.user.findOne();
				json = post.toPublic();
				expect(json.author).to.containSubset(expectedUser);
			});
		});

		context('default public key', () => {
			checkForeignKeys();
		});
		context('public key is key', () => {
			beforeEach(() => {
				models.forEach((model) => { model.presentationKey = 'key'; });
				presentationKey = 'key';
			});
			afterEach(() => {
				// Reset after the tests
				models.forEach((model) => { model.presentationKey = null; });
				presentationKey = 'uuid';
			});

			checkForeignKeys();
		});
	});

	function itPresentsPublicAttributes() {
		it('presents public attributes', () => {
			const expected = { name: 'Bill Ryan', role: 'Veteran' };
			expect(json).toMatchObject(expected);
		});
	}

	describe('toPublic', () => {
		beforeEach(() => {
			json = user.toPublic();
		});

		itPresentsPublicAttributes();

		it('does not include private attributes', () => {
			expect(json).to.not.have.all.keys('role');
		});
		it('calls correct presenter in nested models', () => {
			expect(user.team.secretPower).to.not.have.all.keys(models.team.privateAttributes);
			expect(user.posts[0]).to.not.have.all.keys(models.post.privateAttributes);
		});
		it("doesn't include private models", () => {

		});
	});
	describe('toPrivate', () => {
		beforeEach(() => {
			json = user.toPrivate();
		});

		itPresentsPublicAttributes();

		it('presents private attributes', () => {
			const expected = { role: 'Veteran' };
			expect(json).toMatchObject(expected);
		});
		it('calls correct presenter in nested models', () => {
			expect(user.team.secretPower).to.have.all.keys(models.team.privateAttributes);
			expect(user.posts[0]).to.have.all.keys(models.post.privateAttributes);
		});
		it('includes private models', () => {
			expect(user.comments[0].to.have.all.keys(models.comments.privateAttributes));
		});
	});
});
