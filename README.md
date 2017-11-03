Simple, flexible JSON presentation methods for sequelize

Useful in situations when a separate presentation layer or views would be overkill.
Supports hiding internal ids and mapping them to external keys and creating the
appropriate foreign keys.

# Getting Started

```js
Presenter.extendModels(sequelize.models, {
  presentationKey: 'uuid', // default
});
```

```js
Post = sequelize.define('post', { ... });

Post.publicAttributes = ['title', 'body', 'userUuid'];
Post.nestedModels = ['comments'];

post = await Post.findOne();

post.toPublic();

// Will yield something like
{
  title: 'My Post',
  body: 'This is my post',
  userUuid: 'uuid_for_user',
  comments: {
    [
      comment1.toPublic(),
    ]
  }
}
```

# Methods
Assing parkes-presenter adds 3 methods to instances of your models

### presentJson(permittedAttributes, { include, includeMethod })

`permittedAttributes` the attributes to copy from the model, if these end in the
name of your presentation key (eg postUuid), a virtual foreign
`include` array of model names to include when creating JSON
`includeMethod` method to call on nested models to generate their JSON

### toPublic

calls `presentJson` with the class's publicAttributes and nestedModels

### toPrivate

Alternate presenter that uses privateAttributes and nestedModels.private

# Lazy Loading
By default, parkes-presenter will lazy load any missing associations.

To prevent infinite recursion, it will not repeat a nested model.

This does come at a performance cost. To improve performance you may want to
eager load associations before passing them in.

You can disable lazy loading by setting the
`missingAssociations` option. It can be set to either `false`, `'warn'` or `'load'`.

`'load'` enables the default behaviour of lazy loading.

If set to `false` then associations (and foreign keys) will only be present if
they have been eager loaded from sequelize (or if you manually add them to the
record).

Setting `warn` will cause console warnings when expected associations are missing.

This can get pretty noisy, so you can also pass in an object specifying `'warn'` or
`'load'` for each model name.

```js
Presenter.extendModels(sequelize.models, {
  missingAssociations: {
    post: 'warn',
    user: 'load',
    comment: 'false'
  }
});
```

# Eager Loading

To eager load associations use the `include` option. You should also use `duplicating: false`
where possible (eg belongsTo and hasOne associations) to improve query performance.

```
User.findOne({ include: [
    { model: Post, as: 'posts' },
    { model: Team, as: 'team', duplicating: false },
  ]
})
```

© 2017 Agency Ventures
