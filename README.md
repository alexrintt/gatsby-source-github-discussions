### Installation

To install this package just run:

```shell
npm install @alexrintt/gatsby-source-github-discussions
                    # or
yarn add @alexrintt/gatsby-source-github-discussions
```

### Usage

In your `gatsby-config.js`:

```js
{
  resolve: `@alexrintt/gatsby-source-github-discussions`,
  options: {
    owner: `alexrintt`,
    repo: `rintt`,
    githubToken: process.env.GITHUB_TOKEN,
    // You can use this key to filter any resource.
    // So you can use multiple instances of this plugin, keep the relationships
    // and filter then.
    instance: `Post`,
    extendDiscussionType: (discussion: any) => {
      // type of discussion == "Discussion", see GitHub API reference below.
      // https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions#discussion
      // Not all fields are included but most of them.

      const slug = slugify(discussion.title, discussion.createdAt);
      const path = (blogConfig.postsBasePath ?? ``) + `/` + slug;
      const url = blogConfig.domain + path;

      return {
        ...discussion,
        discussionUrl: discussion.url,
        url,
        path,
        slug,
      };
    },
  },
},
```
