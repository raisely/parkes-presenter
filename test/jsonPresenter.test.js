const Presenter = require('../');
const testDb = require('./testModels');
const chai = require('chai');
const chaiSubset = require('chai-subset');
const _ = require('lodash');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

const { models } = testDb;
const { expect } = chai;

chai.use(chaiSubset);
chai.use(sinonChai);

describe('jsonPresenter', () => {
	let user;
	let json;
	let presentationKey = 'uuid';
	const expectedUser = { name: 'Bill Ryan' };

	before(async () => {
		Presenter.extendModels(models);
		await testDb.init();
	});

	beforeEach(async () => {
		user = await models.user.findOne({
			include: [models.post, models.team],
		});
	});

	describe('presentJson', () => {
		beforeEach(async () => {
			json = await user.presentJson(models.user.publicAttributes, {
				include: models.user.nestedModels,
			});
		});

		it('copies in attributes', () => {
			expect(json).to.containSubset(expectedUser);
		});

		it('defines null attributes', () => {
			expect(Object.keys(json)).to.include('bio');
		});

		context('nested models', () => {
			it('includes nested model', () => {
				expect(json.team).to.containSubset({ name: 'Generations' });
			});

			it('includes nested collection', () => {
				expect(json.posts).to.containSubset([{ title: 'The Defining Moment of our Times' }]);
			});

			it('renames nested models', async () => {
				const post = await models.post.findOne({
					include: [models.user],
				});
				json = await post.toPublic();
				expect(json.author).to.containSubset(expectedUser);
			});
		});

		function checkForeignKeys() {
			it('populates public foreign keys', () => {
				const key = `team${_.capitalize(presentationKey)}`;
				expect(json[key]).to.equal(`${presentationKey}_for_team`);
			});
			it('populates renamed nested models', () => {
				const key = `author${_.capitalize(presentationKey)}`;
				expect(json.posts[0][key]).to.equal(`${presentationKey}_for_bill`);
			});
		}

		context('default public key', () => {
			checkForeignKeys();
		});
		context('public key is key', () => {
			before(() => {
				_.forIn(models, (model) => { model.$presentationOptions.presentationKey = 'key'; });
				presentationKey = 'key';
			});
			after(() => {
				// Reset after the tests
				_.forIn(models, (model) => { model.$presentationOptions.presentationKey = null; });
				presentationKey = 'uuid';
			});

			checkForeignKeys();
		});

		describe('warnings', () => {
			const warningText = 'post association requested but post model was not included'

			beforeEach(async () => {
				sinon.stub(console, 'warn');
				const comment = await models.comment.findOne();
				await comment.toPublic();
			});
			afterEach(() => {
				// eslint-disable-next-line no-console
				console.warn.restore();
			});
			after(() => {
				models.comment.$presentationOptions.warnMissing = false;
			});

			function itDoesNotWarn() {
				it('does not warn', () => {
					// eslint-disable-next-line no-console
					expect(console.warn).to.not.have.been.calledWith(warningText);
				});
			}

			function itWarns() {
				it('shows warning', () => {
					// eslint-disable-next-line no-console
					expect(console.warn).to.have.been.calledWith(warningText);
				});
			}

			context('disabled', () => {
				before(() => {
					models.comment.$presentationOptions.missingAssociations = false;
				});
				itDoesNotWarn();
			});
			context('enabled, but not for this model', () => {
				before(() => {
					models.comment.$presentationOptions.missingAssociations = { user: 'warn' };
				});
				itDoesNotWarn();
			});
			context('enabled', () => {
				before(() => {
					models.comment.$presentationOptions.missingAssociations = 'warn';
				});
				itWarns();
			});
			context('enabled for this model', () => {
				before(() => {
					models.comment.$presentationOptions.missingAssociations = { comment: 'warn' };
				});
				itWarns();
			});
		});
	});

	function itPresentsPublicAttributes() {
		it('presents public attributes', () => {
			const expected = { name: 'Bill Ryan' };
			expect(json).to.containSubset(expected);
		});
	}

	describe('toPublic', async () => {
		beforeEach(async () => {
			json = await user.toPublic();
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
	describe('toPrivate', async () => {
		beforeEach(async () => {
			json = await user.toPrivate();
		});

		itPresentsPublicAttributes();

		it('presents private attributes', () => {
			const expected = { role: 'Veteran' };
			expect(json).to.containSubset(expected);
		});
		it('calls correct presenter in nested models', () => {
			expect(json.team).to.include.all.keys(models.team.privateAttributes);
			expect(json.posts[0]).to.include.all.keys(models.post.privateAttributes);
		});
		it('includes private nested models', async () => {
			const comment = await models.comment.findOne();
			json = await comment.toPrivate();
			expect(comment.user).to.include.all.keys(models.user.privateAttributes);
		});
	});
});
