'use strict';

const _ = require('lodash');

/**
  * Helper method to refactor toPublic and toPrivate methods
  * Copies the record's allowedAttributes into a POJO
  * and also calls toPublic or toPrivate on any nested objects
  *
  * @example
  * model = donations.findOne({ include: [{ model: profiles, as: 'profile' }] });
  * body = filterAttributes(model, ['amount', 'fee'], { include: ['profile'] });
  *
  * console.log(body) // { amount: 1200, fee: 100, profile: model.profile['toPublic']() }
  *
  * @param {Object} model The sequelize record to filter
  * @param {String[]} allowedAttributes Array of attributes to copy
  * @param {String[]} options.include Array of nested models to include
  * @param {String} options.includeMethod Name of the method to call on nested models
  *										 (default: 'toPublic')
  */
function present(model, allowedAttributes, options) {
	const includeMethod = options.includeMethod || 'toPublic';
	const include = options.include || [];

	const uuids = allowedAttributes.filter(attr => attr.endsWith('Uuid'));
	const normalAttributes = _.difference(allowedAttributes, uuids);

	// Copy normal atributes across
	const values = _.pick(model.get(), allowedAttributes);

	// Map ids to uuids
	uuids.forEach((foreignKey) => {
		const modelName = foreignKey.split('Uuid')[0];

		if (model[modelName] || model[foreignKey]) {
			// Copy foreignKey over if the controller has explicitly set it
			values[foreignKey] = model[foreignKey] || model[modelName].uuid;
		} else {
			// Don't add overhead by doing extra lookups
			// If the necesarry model wasn't joined, flag to developers that it's missing
			// console.log(`${foreignKey} attribute requested but ${modelName} was not included`);
		}
	});

	// Apply toPublic/toPrivate to nested models
	include.forEach((name) => {
		let attribute = name;
		let rename = name;
		if (typeof name !== 'string') {
			{ attribute, rename } = name;
		}

		if (model[attribute] && Array.isArray(model[attribute])) {
			values[rename] = model[attribute].map(r => r[includeMethod]());
		} else if (model[attribute] && !Array.isArray(model[attribute])) {
			values[rename] = model[attribute][includeMethod]();
		}
	});

	// Map any snake case names to camel case
	return values;
}

function toPublic() {
	return present(this, this.$Model.publicAttributes, {
		include: this.$Model.nestedModels,
	});
}

function toPrivate() {
	return present(this, this.$Model.privateAttributes, {
		include: this.$Model.nestedModels,
		includeMethod: 'toPrivate',
	});
}

module.exports = { present, toPublic, toPrivate };
