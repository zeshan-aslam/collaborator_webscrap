const PuppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const fs = require("fs").promises;
process.send = process.send || function () {};

const data = {
  username: "abdullahzahid@gmail.com",
  password: "Muneeb070*",
  NoOfResult: 3,
};
let nextPageCounter = 0;
let PageReference = null;
const scrapperFunction = async (username, password, NoOfResult) => {
  PuppeteerExtra.use(StealthPlugin());
  const browser = await PuppeteerExtra.launch({
    //executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    executablePath: "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome",
    headless: false,
  });
  console.log("Browser has Launched!!");

  try {
    const page = await browser.newPage();
    await page.goto("https://collaborator.pro/login", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await page.waitForTimeout(2000);
    const acceptCookiesButton = await page.$(".gdpr-blur__accept-all");
    if (acceptCookiesButton) {
      await acceptCookiesButton.click();
      await page.waitForTimeout(2000);
    }
    await page.type("input#loginform-identity", username, { delay: 20 });
    await page.type("input#loginform-password", password, { delay: 20 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }),
    ]);
    console.log("Successfully logged in!");
    try {
      const storedPageRef = await fs.readFile("pageReference.txt", "utf-8");
      PageReference = storedPageRef.trim();
    } catch (error) {
      console.log(
        "No stored page reference found. Starting from the beginning."
      );
    }
    await page.goto(
      PageReference
        ? `https://collaborator.pro/${PageReference}`
        : "https://collaborator.pro/catalog/creator/article",
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );
    console.log("Clicked on 'Catalog of Sites' tab");
    const scrapePageData = async (page) => {
      const selector =
        ".catalog-grid__center .w-100 .catalog-grid-row .c-t-site .link";
      await page.waitForSelector(selector, { timeout: 120000 });
      const childDivHTMLContents = await page.evaluate(() => {
        const mainDiv = document.querySelector(".catalog-grid__center .w-100");
        const childDivs = mainDiv.querySelectorAll(
          ".catalog-grid-row .c-t-site .link"
        );
        return Array.from(childDivs).map((link) => ({
          href: link.getAttribute("href"),
          text: link.innerText.trim(),
        }));
      });
      console.log("per page publishers", childDivHTMLContents.length);
      await page.waitForTimeout(7000);
      const nextButton = await page.evaluate(() => {
        const button = document.querySelector(
          ".col-lg-7 .cl-pagination__item_next a"
        );
        return {
          href: button ? button.getAttribute("href") : null,
        };
      });
      console.log("has next page... ", nextButton);
      // Your existing scraping loop
      for (let i = 0; i < childDivHTMLContents.length; i++) {
        await page.waitForTimeout(10000);
        const { href, text } = childDivHTMLContents[i];
        // Navigate to the link
        await page.goto(href, {
          waitUntil: "domcontentloaded",
          timeout: 120000,
        });
        await page.waitForTimeout(10000);
        const selector =
          ".site-page-details__keywords .site-page__keywords-list li";
        await page.waitForSelector(selector, { timeout: 120000 });
        try {
          const PublishersData = await page.evaluate(() => {
            const PublisherNameElements = document.querySelector(
              ".text.text_ellipsis.fs-22.fw-bold.m-r-5"
            );
            const PublisherLinkElements = document.querySelector(
              ".site-page-head .fa-external-link"
            );
            const categoryElements = document.querySelector(
              ".fs-16.text_line-height-normal"
            );
            const row = document.querySelector(
              ".site-page__main .site-page-details > :nth-child(4)"
            );
            const PublisherName = PublisherNameElements
              ? PublisherNameElements.textContent.trim().replace(":", "")
              : null;
            const PublisherLink = PublisherLinkElements
              ? PublisherLinkElements.getAttribute("href")
              : null;
            const category = categoryElements
              ? categoryElements.textContent.trim().replace(":", "")
              : null;
            if (!row) {
              return null;
            }
            const elements = Array.from(row.querySelectorAll(".fs-16"));
            const title = elements[0].innerText.trim();
            const description = elements
              .slice(1)
              .map((el) => el.innerText.trim())
              .join("\n");
            return {
              publisherName: PublisherName,
              website: PublisherLink,
              title: title,
              description: description,
              category: category,
            };
          });
          const PublisherAdditionalInfo = await page.evaluate(() => {
            const paramsDivs = document.querySelectorAll(
              ".site-page-details__params.col-lg.col-md-6"
            );
            let detailsArray = [];
            paramsDivs.forEach((paramsDiv) => {
              const listItems = Array.from(
                paramsDiv.querySelectorAll("ul.site-page-details__list li")
              );
              const details = [];
              listItems.forEach((li) => {
                const key = li.innerText.trim().replace(/\s+/, " ");
                let data = "";
                const floatRightElement = li.querySelector(
                  ".float-right.text-black"
                );
                if (floatRightElement) {
                  data = floatRightElement.textContent.trim();
                } else {
                  const divElement = li.querySelector(
                    "div.float-right.text-black"
                  );
                  if (divElement) {
                    data = divElement.textContent.trim();
                  }
                }
                const cleanedlabel = key.replace(/.*\n/, "").trim();
                const label = cleanedlabel.replace(data, "").trim();
                detailsArray.push({ label, value: data });
              });
            });
            return detailsArray.flat();
          });
          const PublisherDetails = await page.evaluate(() => {
            const mainDiv = document.querySelector(".site-page-details");
            if (!mainDiv) {
              return null;
            }
            const userDetailElements = mainDiv.querySelectorAll(
              ".site-page-details__row.py-4, .col-xl.col-6.mb-4.mb-xl-0"
            );
            const userDetailsData = Array.from(userDetailElements)
              .map((userDetail) => {
                const titleElement = userDetail.querySelector(
                  ".fs-16.fw-bold.mb-1"
                );
                const title = titleElement
                  ? titleElement.textContent.trim()
                  : null;
                const valueElement = userDetail.querySelector(
                  ".fs-16:not(.fw-bold.mb-1)"
                );
                const value = valueElement
                  ? valueElement.textContent.trim()
                  : null;
                return {
                  label: title,
                  value: value,
                };
              })
              .filter((entry) => {
                return (
                  ["Country", "Regions", "Site Language"].includes(
                    entry.label
                  ) && entry.value !== null
                );
              });
            const uniqueLabels = new Set();
            const uniqueUserDetails = userDetailsData.filter((entry) => {
              if (!uniqueLabels.has(entry.label)) {
                uniqueLabels.add(entry.label);
                return true;
              }
              return false;
            });
            return uniqueUserDetails;
          });
          const geographyData = await page.evaluate(() => {
            const trafficListContainer = document.querySelector(
              ".list-traffic_big.list-traffic.overflow-hidden"
            );
            if (!trafficListContainer) {
              return null;
            }
            const listItems = Array.from(
              trafficListContainer.querySelectorAll("li")
            );
            const data = listItems.map((li) => {
              const itemIcon = li.querySelector(".list-traffic__item-icon");
              const value =
                li
                  .querySelector(".list-traffic__item-value")
                  ?.textContent.trim() ?? "";
              const countryName =
                li
                  .querySelector(".list-traffic__item-data .text-truncate")
                  ?.textContent.trim() ?? "";
              let countryDataContent = "";
              if (itemIcon) {
                countryDataContent = itemIcon.getAttribute("data-content");
              }
              return {
                label: countryDataContent || countryName,
                value: value,
              };
            });
            return data;
          });
          const trafficData = await page.evaluate(() => {
            const listTrafficContainer = document.querySelector(
              ".list-traffic_big.list-traffic .list-traffic"
            );
            if (!listTrafficContainer) {
              return null;
            }
            const listItems = Array.from(
              listTrafficContainer.querySelectorAll("li")
            );
            const data = listItems.map((li) => {
              const keyElement = li.querySelector(".list-traffic__item-data");
              const key = keyElement ? keyElement.textContent.trim() : "";
              const valueElement = li.querySelector(
                ".list-traffic__item-data .list-traffic__item-value"
              );
              const value = valueElement ? valueElement.textContent.trim() : "";
              const cleanedlabel = key.replace(/.*\n/, "").trim();
              const label = cleanedlabel.replace(value, "").trim();
              return {
                label: label,
                value: value,
              };
            });
            return data;
          });
          const formatData = await page.evaluate(() => {
            const formatItemContainer = document.querySelector(".format-item");
            if (!formatItemContainer) {
              return null;
            }
            const bodyElement =
              formatItemContainer.querySelector(".format-item__body");
            const footerElement = formatItemContainer.querySelector(
              ".format-item__footer"
            );
            if (!bodyElement || !footerElement) {
              return null;
            }
            const footerItems = Array.from(
              footerElement.querySelectorAll(".format-item__footer-item")
            );
            const footerData = footerItems.map((item) => {
              const label = item.querySelector("label").textContent.trim();
              const value = item
                .querySelector(".ml-auto.font-weight-bold.fs-12")
                .textContent.trim();
              return { label, value };
            });
            const label = bodyElement
              .querySelector(".format-item__name")
              .textContent.trim();
            const value = bodyElement
              .querySelector(".font-weight-bold.fs-16")
              .textContent.trim();
            const newObject = { label: label, value: value };
            const updatedFooterData = [...footerData, newObject];
            return updatedFooterData;
          });
          const AdditionalInfo = [
            ...PublisherDetails,
            ...PublisherAdditionalInfo,
            ...geographyData,
            ...trafficData,
            ...formatData,
          ];
          const tags = await page.evaluate(() => {
            const keywordsContainer = document.querySelector(
              ".site-page-details__row :nth-child(9) .site-page-details__keywords .site-page__keywords-list"
            );
            return Array.from(keywordsContainer.querySelectorAll("li"))
              .map((element) => element.textContent.trim())
              .filter((value) => value.length > 0);
          });
          try {
            const apiEndpoint = "https://searlco.xyz/PublisherScrap.php";
            const publisherResponse = await axios.post(apiEndpoint, {
              action: "publisherData",
              data: PublishersData,
            });
            process.send({ message: 'inserted'})
            console.log(
              "API Response Publishers Data:",
              publisherResponse.data
            );
            const resPubId = await axios.post(apiEndpoint, {
              action: "PublisherId",
              publisherName: PublishersData?.publisherName,
            });
            const publisherId = resPubId.data.publisher_id;
            const tagsResponse = await axios.post(apiEndpoint, {
              action: "tags",
              data: tags,
              publisher_id: publisherId,
            });
            const pubAdditionalResponse = await axios.post(apiEndpoint, {
              action: "publisherAdditionalInfo",
              data: AdditionalInfo,
              publisher_id: publisherId,
            });
          } catch (error) {
            console.error("Error calling the API:", error.message);
            process.send({ error: error.message });
          }
        } catch (error) {
          console.log(error);
          process.send({ error: error.message });
        }
        await page.goBack({ timeout: 120000 });
        await page.waitForTimeout(5000);
      }
      if (nextButton && nextButton.href) {
        console.log("Going to the next page...");
        PageReference = nextButton.href;
        await fs.writeFile("pageReference.txt", PageReference);
        nextPageCounter++;
        if (nextPageCounter >= 15) {
          browser.close();
          return "Done";
        }
        await page.waitForTimeout(5000);
        await Promise.all([
          page.goto(`https://collaborator.pro/${nextButton.href}`, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          }),
        ]);
        await page.waitForTimeout(5000);
        await scrapePageData(page);
      } else {
        console.log("No next page available.");
      }
    };
    await scrapePageData(page);
    browser.close();
    return "Done";
  } catch (error) {
    console.log("SomeThing Unexpected happened", error.message);
    process.send({ error: error.message });
    setTimeout(() => {
      browser.close();
      return {};
    }, 1000);
  }
};
const mainFunction = async () => {
  const result = await scrapperFunction(
    data.username,
    data.password,
    data.NoOfResult
  );
  console.log("Getting the final ====> ", result);
  process.exit(0);
};
mainFunction();
