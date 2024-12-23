# GitPerformance
## Quick tool to get a report on Pull Requests that were created by you on a repository


## Features

- Export CSV for all the Pull Requests approved with number of PR, created at, merged at and the approval
- Export CSV with metrics only for months grouping by PRs.

## Installation

GitPerformance requires [Node.js](https://nodejs.org/) v10+ to run.

Clone and install the packages:

```sh
git clone git@github.com:merighifacundo/gitperformance.git
cd gitperformance
npm install

```

Create the .env file using the .env_example, you'll need to create a github token.

```sh
npm run start
```


