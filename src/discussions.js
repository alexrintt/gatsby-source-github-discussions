const { graphql } = require("@octokit/graphql");

const MAX_RESULTS = 100;

async function listDiscussionsOfRepo(
  owner,
  repo,
  { token, cursor, categoryId, perPage, orderByField, orderByDirection }
) {
  const data = graphql(
    `
      query ListDiscussionsOfRepo(
        $owner: String!
        $name: String!
        $after: String
        $first: Int!
        $categoryId: ID
        $orderBy: DiscussionOrder!
      ) {
        repository(owner: $owner, name: $name) {
          discussions(
            categoryId: $categoryId
            after: $after
            first: $first
            orderBy: $orderBy
          ) {
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              body
              category {
                name
                githubId: id
              }
              createdAt
              updatedAt
              url
              githubId: id
              number
              title
              locked
              lastEditedAt
              labels(
                first: 100
                orderBy: { field: CREATED_AT, direction: DESC }
              ) {
                nodes {
                  color
                  createdAt
                  description
                  githubId: id
                  isDefault
                  name
                  resourcePath
                  updatedAt
                  color
                  url
                }
              }
              author {
                avatarUrl
                login
                resourcePath
                url
                typename: __typename
                ... on User {
                  anyPinnableRepositories: anyPinnableItems(type: REPOSITORY)
                  anyPinnableGists: anyPinnableItems(type: GIST)
                  anyPinnableIssues: anyPinnableItems(type: ISSUE)
                  anyPinnableProjects: anyPinnableItems(type: PROJECT)
                  anyPinnablePullRequests: anyPinnableItems(type: PULL_REQUEST)
                  anyPinnableUsers: anyPinnableItems(type: USER)
                  anyPinnableOrganizations: anyPinnableItems(type: ORGANIZATION)
                  anyPinnableTeams: anyPinnableItems(type: TEAM)
                  bio
                  bioHTML
                  company
                  companyHTML
                  name
                  createdAt
                  updatedAt
                  githubId: id
                  databaseId
                  email
                  hasSponsorsListing
                  isBountyHunter
                  login
                  isCampusExpert
                  isDeveloperProgramMember
                  isEmployee
                  isGitHubStar
                  isHireable
                  isSiteAdmin
                  isViewer
                  isSponsoringViewer
                  websiteUrl
                  twitterUsername
                  url
                  viewerIsSponsoring
                }
              }
            }
          }
        }
      }
    `,
    {
      owner,
      name: repo,
      after: cursor,
      categoryId,
      first: perPage,
      orderBy: {
        field: orderByField,
        direction: orderByDirection,
      },
      headers: {
        authorization: "token " + token,
      },
    }
  );
  return data;
}
exports.listDiscussionsOfRepo = listDiscussionsOfRepo;

async function fetchDiscussions(
  owner,
  repo,
  {
    token,
    categoryId,
    categorySlug,
    resultsLimit,
    orderByDirection,
    orderByField,
  }
) {
  const context = { discussions: [], cursor: null };

  const getCategoryIdFromSlug = () =>
    typeof categorySlug === "string"
      ? getDiscussionCategoryId(owner, repo, {
          token,
          categorySlug,
        })
      : null;

  categoryId = categoryId ?? (await getCategoryIdFromSlug());

  while (true) {
    const {
      repository: {
        discussions: {
          pageInfo: { hasNextPage, endCursor },
          nodes: discussions,
        },
      },
    } = await getDiscussions(owner, repo, {
      categoryId,
      token,
      cursor: context.cursor,
      resultsLimit,
      orderByDirection,
      orderByField,
    });

    context.discussions = [
      ...context.discussions,
      ...discussions.map((d) => ({
        ...d,
        labels: d.labels.nodes.map((e) => e),
      })),
    ];

    context.cursor = endCursor;

    const reachedLimit =
      typeof resultsLimit === "number" &&
      context.discussions.length >= resultsLimit;

    if (!hasNextPage || reachedLimit) break;
  }

  return context.discussions;
}
exports.fetchDiscussions = fetchDiscussions;

async function getDiscussionCategoryId(owner, repo, { categorySlug, token }) {
  const {
    repository: {
      discussionCategory: { id },
    },
  } = await graphql(
    `
      query GetRepoDiscussionCategoryId(
        $owner: String!
        $name: String!
        $slug: String!
      ) {
        repository(owner: $owner, name: $name) {
          discussionCategory(slug: $slug) {
            githubId: id
          }
        }
      }
    `,
    {
      owner,
      name: repo,
      slug: categorySlug,
      headers: {
        authorization: "token " + token,
      },
    }
  );
  return id;
}
exports.getDiscussionCategoryId = getDiscussionCategoryId;

async function getDiscussions(
  owner,
  repo,
  { categoryId, token, cursor, resultsLimit, orderByDirection, orderByField }
) {
  return await listDiscussionsOfRepo(owner, repo, {
    categoryId,
    token,
    cursor,
    perPage: Math.max(1, Math.min(MAX_RESULTS, resultsLimit ?? MAX_RESULTS)),
    orderByDirection,
    orderByField,
  });
}
exports.getDiscussions = getDiscussions;
