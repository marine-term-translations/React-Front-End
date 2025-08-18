const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ghpages = require("gh-pages");

// Function to run shell commands synchronously
const runCommand = (command) => {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (err) {
    console.error(`Failed to execute: ${command}`, err);
    process.exit(1);
  }
};

// Function to update the "homepage" field in package.json using callbacks
const updateHomepageAndEnv = (repoName, githubUsername, callback) => {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const envPath = path.join(process.cwd(), ".env.production");

  // Update package.json
  fs.readFile(packageJsonPath, "utf-8", (err, data) => {
    if (err) {
      console.error("Failed to read package.json", err);
      process.exit(1);
    }

    const packageJson = JSON.parse(data);
    const homepageUrl = `https://${githubUsername}.github.io/${repoName}/`;
    packageJson.homepage = homepageUrl;

    // Write the updated package.json back to file
    fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      (err) => {
        if (err) {
          console.error("Failed to write package.json", err);
          process.exit(1);
        }

        console.log(`Updated homepage in package.json to ${homepageUrl}`);

        // Update .env.production file
        fs.readFile(envPath, "utf-8", (err, envData) => {
          if (err) {
            console.error("Failed to read .env.production", err);
            process.exit(1);
          }

          // Update REACT_APP_REPO variable in .env.production
          const updatedEnvData = envData.replace(
            /REACT_APP_REPO=.*/,
            `REACT_APP_REPO=${repoName}`
          );

          // Write the updated .env.production file back
          fs.writeFile(envPath, updatedEnvData, (err) => {
            if (err) {
              console.error("Failed to write .env.production", err);
              process.exit(1);
            }

            console.log(
              `Updated REACT_APP_REPO in .env.production to ${repoName}`
            );
            callback();
          });
        });
      }
    );
  });
};

// Function to deploy the React project to GitHub Pages
const deploy = (repoName) => {
  const githubUsername = "marine-term-translations";

  //before building make sure that the env variable REACT_APP_REPO is set to the repository name
  if (!process.env.REACT_APP_REPO) {
    console.log(
      "Environment variable REACT_APP_REPO is not set. Please set it before running the deploy script."
    );
    // Set it to the repository name
    process.env.REACT_APP_REPO = repoName;
  }

  // Update the "homepage" field in package.json, then build and deploy
  updateHomepageAndEnv(repoName, githubUsername, () => {
    // Build the React app
    console.log("Building React app...");
    runCommand("npm run build");

    // Ensure the build directory exists
    const buildPath = path.join(process.cwd(), "build");
    // Generate the repository URL from the username and repository name
    const repoUrl = `https://github.com/${githubUsername}/${repoName}.git`;

    // Deploy the build folder to GitHub Pages
    console.log("Deploying to GitHub Pages...");
    ghpages.publish(
      "build",
      {
        branch: "gh-pages",
        repo: repoUrl,
        dotfiles: true,
      },
      (err) => {
        if (err) {
          console.error("Deployment failed:", err);
        } else {
          console.log("Deployment successful!");
          console.log(
            `Your site is live at https://${githubUsername}.github.io/${repoName}/`
          );
        }
      }
    );
  });
};

// Retrieve the repository name from the script's arguments
const repoName = process.argv[2];
if (!repoName) {
  console.error("Usage: node deploy.js <repository-name>");
  process.exit(1);
}

// Start the deployment process
deploy(repoName);
