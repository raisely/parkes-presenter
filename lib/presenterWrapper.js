const jsonPresenter = require('./jsonPresenter');
const _ = require('lodash');

/**
  * Add presentation helpers to your models
  *
  * @param models Object containing all your models
  * @param {string} options.presentationKey Name of the key to use for foreign keys
  *		(default: 'uuid')
  * @param {string} options.missingAssociations How to handle missing nested models
  *
  * @description
  */
function extendModels(models, options) {
	_.forIn(models, (model) => {
		Object.assign(model.prototype, jsonPresenter);
		model.$presentationOptions = Object.assign({
			missingAssociations: 'load',
		}, options);
	});
}

module.exports = { extendModels };
