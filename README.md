## Installation

To install this package just run:

```shell
npm install @alexrintt/gatsby-source-github-discussions
# or
yarn add @alexrintt/gatsby-source-github-discussions
```

## Usage

In your `gatsby-config.js`:

```js
{
  resolve: `@alexrintt/gatsby-source-github-discussions`,
  options: {
    owner: `alexrintt`,
    repo: `rintt`,
    // Most likely to be an Announcements channel category, this way
    // only users with repo write access can allow a post to be deployed.
    categorySlugs: [`Published`],
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

## Features

This plugin fetches the discussions from the given configured repositories (if enabled) and link with their respective authors and labels. Further details are available on [Gatsby - Creating a source plugin](https://www.gatsbyjs.com/docs/how-to/plugins-and-themes/creating-a-source-plugin/).

- Custom schema type for this use-case, this means you can filter discussion by authors and vice-versa and take full advantage of Gatsby GraphQL shema types.
- Authors have optimized _avatarImage_.
- Discussions have optimized _thumbnailImageUrl_.
- GitHub flavored is fully supported through `gatsby-tranform-remark` plugin.
- Support schema type customization through `customSchemaTypes` option.
- Any extended discussion field which ends with `imageUrl` will be automatically optimized and to enable it you can extend the field types.

<p>
  <img src="https://user-images.githubusercontent.com/51419598/194051206-ec8bfac4-bcc0-4c8b-9f0a-4267d72b98d7.png" width="250" />
  <img src="https://user-images.githubusercontent.com/51419598/194051344-0a5770fa-1269-4467-9024-37039aac2f75.png" width="250" /><br />
  <img src="https://user-images.githubusercontent.com/51419598/194058887-de70e09c-da65-4901-bd8b-e99ec8c3904b.png" width="250" />
  <img src="https://user-images.githubusercontent.com/51419598/194051081-5f30f1ca-b580-4249-b374-45469e9c0fa9.png" width="250" />
</p>

<br>

<samp>

<h2 align="center">
  Open Source
</h2>
<p align="center">
  <sub>Copyright © 2022-present, Alex Rintt.</sub>
</p>
<p align="center">Gatsby Source GitHub Discussions <a href="https://github.com/alexrintt/gatsby-source-github-discussions/blob/master/LICENSE">is MIT licensed 💖</a></p>
<p align="center">
  <img src="https://user-images.githubusercontent.com/51419598/194058464-f67c7fb5-9066-49b5-aa94-cf34830708ad.png" width="35" />
</p>

</samp>
