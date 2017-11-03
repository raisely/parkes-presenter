'use strict';

const _ = require('lodash');

/**
  * Helper method to refactor toPublic and toPrivate methods
  * Copies the record's allowedAttributes into a POJO
  * and also calls toPublic or toPrivate on any nested objects
  *
  * @example
  * user = users.findOne({ include: [{ model: profiles, as: 'profile' }] });
  * body = presentJson(model, ['name', 'bio'], { include: ['profile'] });
  *
  * console.log(body) // { name: 'Shaun', bio: 'of the dead', profile: user.profile['toPublic']() }
  *
  * @param {String[]} allowedAttributes Array of attributes to copy
  * @param {String[]} options.include Array of nested models to include
  * @param {String} options.includeMethod Name of the method to call on nested models
  *										 (default: 'toPublic')
  */
async function presentJson(allowedAttributes, options) {
	const includeMethod = options.includeMethod || 'toPublic';
	const include = options.include || [];

	const keyName = presentationKey(this.constructor);
	const keySuffix = _.capitalize(keyName);

	const keys = allowedAttributes.filter(attr => attr.endsWith(keySuffix));
	const normalAttributes = _.difference(allowedAttributes, keys);
	const modelCache = {};

	// Copy normal atributes across
	const values = _.pick(this.get(), normalAttributes);

	let promises = [];

	// Map ids to presentation keys (uuids)
	keys.forEach((foreignKey) => {
		let modelName = foreignKey.split(keySuffix)[0];
		// If the model is listed in includes as a rename
		// then use the original model name to lookup
		// the foreign key
		const renamed = include.find(model => _.isObject(model) && (model.rename === modelName));
		if (renamed) modelName = renamed.association;
		const value = this[foreignKey] ||
			(this.get()[modelName] && this.get()[modelName][keyName]);

		if (value) {
			values[foreignKey] = value;
		} else {
			// Lookup the model if needed
			if (actionOnMissing(this.constructor) === 'load') {
				const getter = `get${_.capitalize(modelName)}`;
				const promise = this[getter]().then((nested) => {
					modelCache[modelName] = nested;
					values[foreignKey] = nested[keyName];
				});
				promises.push(promise);
			}

			if (actionOnMissing(this.constructor) === 'warn') {
				// eslint-disable-next-line no-console
				console.warn(`${foreignKey} attribute requested but ${modelName} model was not included`);
			}
		}
	});

	await Promise.all(promises);

	promises = [];

	// Apply toPublic/toPrivate to nested models
	include.forEach((name) => {
		let association = name;
		let rename = name;
		if (typeof name !== 'string') {
			({ association, rename } = name);
		}

		// Allow caller to override the associated by assigning it to the record
		// without calling set
		const nestedModel = modelCache[association] || this[association] || this.get()[association];

		if (nestedModel && Array.isArray(nestedModel)) {
			const asyncMapper = nestedModel.map(m => m[includeMethod]());
			// Call the toPublic/toPrivate asynchronously
			// Once all have resolved, assign the array to our value
			Promise.all(asyncMapper)
				.then((v) => {
					values[rename] = v;
				});
			promises.push(...asyncMapper);
		} else if (nestedModel && !Array.isArray(nestedModel)) {
			promises.push(nestedModel[includeMethod]().then((v) => {
				values[rename] = v;
			}));
		} else if (actionOnMissing(this.constructor) === 'warn') {
			// eslint-disable-next-line no-console
			console.warn(`${rename} association requested but ${association} model was not included`);
		}
	});

	await Promise.all(promises);

	// Map any snake case names to camel case
	return values;
}

/**
  * Determines if this model should warn or lazy load nested models
  * @param {Model} modelClass class of the sequelize model to check options on
  */
function actionOnMissing(modelClass) {
	const onMissing = modelClass.$presentationOptions.missingAssociations;

	const validOptions = ['load', 'warn'];

	if (onMissing) {
		if (validOptions.includes(onMissing)) return onMissing;
		if (validOptions.includes(onMissing[modelClass.name])) return onMissing[modelClass.name];
	}

	return false;
}

/**
  * Helper to check the name of the presentation key attribute to use
  * @return The name configured of 'uuid' by default
  */
function presentationKey(modelClass) {
	return modelClass.$presentationOptions.presentationKey || 'uuid';
}

function selectNestedModels(model, mode = 'public') {
	const { nestedModels } = model.constructor;

	if (nestedModels) {
		if (Array.isArray(nestedModels)) return nestedModels;
		if (Array.isArray(nestedModels[mode])) return nestedModels[mode];
	}

	return [];
}

/**
  * @description
  * Shortcut to call presentJson with the public attributes and nested models
  */
async function toPublic() {
	return this.presentJson(this.constructor.publicAttributes, {
		include: selectNestedModels(this),
	});
}

/**
  * @description
  * Shortcut to call presentJson with the private attributes and nested models
  */
async function toPrivate() {
	return this.presentJson([
		...this.constructor.publicAttributes,
		...this.constructor.privateAttributes,
	], {
		include: selectNestedModels(this, 'private'),
		includeMethod: 'toPrivate',
	});
}

module.exports = { presentJson, toPublic, toPrivate };
