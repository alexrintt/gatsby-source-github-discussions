/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/node-apis/
 */
// You can delete this file if you're not using it

/**
 * You can uncomment the following line to verify that
 * your plugin is being loaded in your site.
 *
 * See: https://www.gatsbyjs.com/docs/creating-a-local-plugin/#developing-a-local-plugin-that-is-outside-your-project
 */
const assert = require("assert");
const { graphql } = require("@octokit/graphql");
const { fetchDiscussions } = require("./src/discussions");
const yup = require("yup");

const { createRemoteFileNode } = require(`gatsby-source-filesystem`);

exports.onPreInit = () => {};

const DiscussionOrderField = {
  CREATED_AT: `CREATED_AT`,
  UPDATED_AT: `UPDATED_AT`,
};

const OrderDirection = {
  ASC: `ASC`,
  DESC: `DESC`,
};

const GitHubObjectType = {
  DISCUSSION: `GitHubDiscussion`,
  LABEL: `GitHubLabel`,
  DISCUSSION_CATEGORY: `GitHubDiscussionCategory`,
  USER: `GitHubUser`,
  BOT: `GitHubBot`,
  ENTERPRISE_USER_ACCOUNT: `GitHubEnterpriseUserAccount`,
  MANNEQUIN: `GitHubMannequin`,
  ORGANIZATION: `GitHubOrganization`,
};

const GitHubRawGraphQLNodeType = {
  USER: `User`,
};

const internalTypes = [...Object.values(GitHubObjectType)];

const isInternalType = (type) => internalTypes.includes(type);

function assertValidOptions(pluginOptions) {
  const optionsShape = yup.object().shape({
    owner: yup.string().required(),
    repo: yup.string().required(),
    githubToken: yup.string().required(),
    maxDiscussionsCount: yup.number(),
    orderByDirection: yup.string().oneOf(Object.values(OrderDirection)),
    orderByField: yup.string().oneOf(Object.values(DiscussionOrderField)),
    categoryIds: yup.array().of(yup.string()),
    categorySlugs: yup.array().of(yup.string()),
  });

  assert(
    pluginOptions.extendDiscussionType == null ||
      typeof pluginOptions.extendDiscussionType === "function",
    `[extendDiscussionType] should return the mapped discussion with additional keys or removed ones.`
  );

  optionsShape.validate(pluginOptions);
}

async function getRepositoryDiscussions({
  owner,
  repo,
  githubToken,
  categoryIds,
  categorySlugs,
  maxDiscussionsCount,
  orderByDirection,
  orderByField,
}) {
  const fetchOnceWithoutFilters = [{}];

  const compareField =
    orderByField === DiscussionOrderField.CREATED_AT
      ? `createdAt`
      : `updatedAt`;

  const desc = orderByDirection === OrderDirection.DESC;

  const _ = (fn) => (a, z) =>
    fn(
      new Date(a[compareField]).getMilliseconds(),
      new Date(z[compareField]).getMilliseconds()
    );

  const compareFn = _((a, z) => (desc ? z - a : a - z));

  const filters =
    categoryIds != null
      ? categoryIds.map((e) => ({ categoryId: e }))
      : categorySlugs != null
      ? categorySlugs.map((e) => ({ categorySlug: e }))
      : fetchOnceWithoutFilters;

  const discussions = (
    await Promise.all(
      filters.map((filter) =>
        fetchDiscussions(owner, repo, {
          token: githubToken,
          resultsLimit: maxDiscussionsCount,
          orderByDirection,
          orderByField,
          ...filter,
        })
      )
    )
  ).reduce((previous, current) => [...previous, ...current], []);
  discussions.sort(compareFn);

  return discussions;
}

exports.sourceNodes = async (
  {
    actions: { createNode },
    createContentDigest,
    createNodeId,
    getNodesByType,
  },
  pluginOptions
) => {
  pluginOptions = pluginOptions ?? {};

  assertValidOptions(pluginOptions);

  const DEFAULT_OPTIONS = {
    orderByDirection: OrderDirection.DESC,
    orderByField: DiscussionOrderField.CREATED_AT,
  };

  const options = Object.assign({}, DEFAULT_OPTIONS, pluginOptions);

  const { instance, extendDiscussionType } = options;

  const discussions = await getRepositoryDiscussions(options);

  const mappedDiscussions = discussions.map((discussion) =>
    (extendDiscussionType ?? ((_) => _))(discussion)
  );

  for (const discussion of mappedDiscussions) {
    // Use the created user node to create the discusion node.
    await createNode({
      ...discussion,
      instance,
      id: createNodeId(`${GitHubObjectType.DISCUSSION}-${discussion.githubId}`),
      parent: null,
      children: [],
      internal: {
        type: GitHubObjectType.DISCUSSION,
        contentDigest: createContentDigest(discussion),
        mediaType: `text/markdown`,
        content: discussion.body,
      },
    });
  }
};

exports.onCreateNode = async (
  {
    node, // the node that was just created
    actions: { createNode, createNodeField },
    createContentDigest,
    createNodeId,
    getCache,
  },
  pluginOptions
) => {
  if (!isInternalType(node.internal.type)) return;

  async function createUserNode(user) {
    const rawGraphQLActorType = user.typename;

    // Discussions/Post created by a non-user actor is not supported yet.
    // If you need to, consider opening an issue with your use-case.
    if (rawGraphQLActorType !== GitHubRawGraphQLNodeType.USER) return;

    await createNode({
      ...user,
      id: createNodeId(`${GitHubObjectType.USER}-${user.githubId}`),
      parent: null,
      children: [],
      internal: {
        type: GitHubObjectType.USER,
        contentDigest: createContentDigest(user),
      },
    });
  }

  async function createLabelNode(label) {
    await createNode({
      ...label,
      id: createNodeId(`${GitHubObjectType.LABEL}-${label.githubId}`),
      parent: null,
      children: [],
      internal: {
        type: GitHubObjectType.LABEL,
        contentDigest: createContentDigest(label),
      },
    });
  }

  if (node.internal.type === GitHubObjectType.DISCUSSION) {
    const discussion = node;

    await createUserNode(discussion.author);

    for (const label of discussion.labels) {
      await createLabelNode(label);
    }
  }

  if (node.internal.type === GitHubObjectType.USER) {
    const userNode = node;

    const fileNode = await createRemoteFileNode({
      url: userNode.avatarUrl,
      parentNodeId: userNode.id,
      createNode,
      createNodeId,
      getCache,
    });

    if (fileNode) {
      createNodeField({ node, name: "avatarImage", value: fileNode.id });
    }
  }
};

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;

  createTypes(`
    type ${GitHubObjectType.USER} implements Node {
      avatarImage: File @link(from: "fields.avatarImage")
      discussions: [${GitHubObjectType.DISCUSSION}] @link(by: "author.githubId", from: "githubId")
    }
    type ${GitHubObjectType.DISCUSSION} implements Node {
      author: ${GitHubObjectType.USER} @link(from: "author.githubId", by: "githubId")
      labels: [${GitHubObjectType.LABEL}] @link(from: "labels.githubId", by: "githubId")
    }
  `);
};
