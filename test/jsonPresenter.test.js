const presenters = require('../');
const testDb = require('./testModels');
const { expect } = require('chai');

const { models } = testDb;

function checkForeignKeys() {
	it('populates public foreign keys', () => {

	});
	it('populates nested array models', () => {
		expect(result.comments[0])
	});
	it('populates nested model', () => {
		expect(result.comments)
	});
	it('renames nested models', () => {

	});
}

describe('jsonPresenter', () => {
	before(async () => {
		// Extend all models with the presenters
		models.forEach((model) => {
			Object.assign(model.prototype, presenters);
		});

		await testDb.init();
	});

	describe('present', () => {
		it('copies in attributes', () => {

		});
		context('default public key', () => {
			checkForeignKeys();
		});
		context('public key is key', () => {
			beforeEach(() => {
				models.forEach((model) => { model.presentationKey = 'key'; });
			});
			afterEach(() => {
				// Reset after the tests
				models.forEach((model) => { model.presentationKey = null; });
			});

			checkForeignKeys();
		});
	});
	describe('toPublic', () => {
		it('presents public attributes', () => {

		});
		it('calls correct presenter in nested models', () => {

		});
	});
	describe('toPrivate', () => {
		it('presents private attributes', () => {

		});
	});
});
