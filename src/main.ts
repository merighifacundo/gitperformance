import * as fs from "fs";
import axios from "axios";
import { PullRequest } from "./types";
import * as dotenv from "dotenv";
import moment from "moment";
import { ReportType } from "./reporting.types";
dotenv.config();

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPO;
const username = process.env.GITHUB_USERNAME;
const filename = process.env.FILENAME || "reporting.csv";
const maxPage = process.env.MAX_PAGES_TO_ITERATE;
const reportType =
  ReportType[process.env.REPORT_TYPE as keyof typeof ReportType];
const yearOfReview: number = process.env.YEAR_OF_REVIEW
  ? Number(process.env.YEAR_OF_REVIEW)
  : 2024;

export const printApprovedPRs = async () => {
  let prsUrl: string | null =
    `https://api.github.com/repos/${repo}/pulls?state=closed&per_page=100`;
  const approvedPRs: PullRequest[] = [];
  while (prsUrl != null) {
    prsUrl = await printPrsApproved(prsUrl, approvedPRs);
  }
  const sorted_and_filter = approvedPRs
    .filter((a) => moment(a.created_at).year() === yearOfReview)
    .sort((a, b) => moment(a.created_at).diff(moment(b.created_at)));
  const output = createReport(sorted_and_filter);
  fs.writeFile(filename, output, (err) => {
    if (err) {
      console.log("Error writing file:", err);
    } else {
      console.log("Successfully wrote file");
    }
  });
};

function createReport(sorted_and_filter: PullRequest[]) {
  if (reportType === ReportType.ALL_COMMITS) {
    let output = '"number","title","created at","merged at","approver"\n';
    sorted_and_filter.forEach((pr: PullRequest, index) => {
      output += `"${index}","${pr.title}","${moment(pr.created_at).format("YYYY/MM/DD")}","${moment(pr.merged_at).format("YYYY/MM/DD")}","${pr.approver}"\n`;
    });
    return output;
  }
  let output = '"month","number of prs"\n';
  for (let index = 0; index < 12; index++) {
    const amount_of_prs = sorted_and_filter.filter(
      (a) => moment(a.created_at).month() === index,
    );
    output += `"${moment(`${index +1 }`, 'M').format('MMMM')}","${amount_of_prs.length}"\n`;
  }
  return output;
}

async function printPrsApproved(
  prsUrl: string,
  approvedPRs: any[],
): Promise<string | null> {
  try {
    const prsResponse = await axios.get(prsUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    const link = prsResponse.headers["link"];
    const start = link.includes("prev")
      ? link.indexOf('"prev", <') + '"prev", <'.length
      : 1;
    let nextString = link.substring(start, link.indexOf('>; rel="next"'));
    if (nextString.includes(`page=${maxPage}`)) {
      nextString = null;
    }
    const prs = prsResponse.data.filter(
      (pr: any) => pr.user.login === username && pr.merged_at !== null,
    );
    for (const pr of prs) {
      if (moment(pr.created_at).year() < yearOfReview) {
        nextString = null;
      }
      if (moment(pr.created_at).year() !== yearOfReview) {
        continue;
      }
      const reviewsUrl = `${pr.url}/reviews`;
      const reviewsResponse = await axios.get(reviewsUrl, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const commitsUrl = `${pr.url}/commits`;
      const commitsResponse = await axios.get(commitsUrl, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const reviews = reviewsResponse.data;
      for (const review of reviews) {
        if (review.state === "APPROVED") {
          const prObject: PullRequest = {
            ...pr,
            commits: commitsResponse.data,
            reviews,
            approver: review.user.login,
          };
          approvedPRs.push(prObject);
          break; // Stop checking reviews once approved
        }
      }
    }

    return nextString;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

printApprovedPRs();
