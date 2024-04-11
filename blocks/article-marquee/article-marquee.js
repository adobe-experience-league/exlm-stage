import {
  fetchLanguagePlaceholders,
  getEDSLink,
  getLink,
  createPlaceholderSpan,
} from '../../scripts/scripts.js';
import { tooltipTemplate } from '../../scripts/toast/toast.js';
import { isSignedInUser, profile } from '../../scripts/data-service/profile-service.js';
import { decorateIcons } from '../../scripts/lib-franklin.js';
import loadJWT from '../../scripts/auth/jwt.js';
import renderBookmark from '../../scripts/bookmark/bookmark.js';
import attachCopyLink from '../../scripts/copy-link/copy-link.js';

/* Fetch data from the Placeholder.json */
let placeholders = {};
try {
  placeholders = await fetchLanguagePlaceholders();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Error fetching placeholders:', err);
}

export async function decorateBookmark(block) {
  const bookmarkId = ((document.querySelector('meta[name="id"]') || {}).content || '').trim();
  const unAuthBookmark = document.createElement('div');
  unAuthBookmark.className = 'bookmark';
  unAuthBookmark.innerHTML = tooltipTemplate('bookmark-icon', 'Bookmark page', `${placeholders.bookmarkUnauthLabel}`);

  const authBookmark = document.createElement('div');
  authBookmark.className = 'bookmark auth';
  authBookmark.innerHTML = tooltipTemplate('bookmark-icon', 'Bookmark page', `${placeholders.bookmarkAuthLabelSet}`);

  const isSignedIn = await isSignedInUser();
  if (isSignedIn) {
    block.appendChild(authBookmark);
    const bookmarkAuthedToolTipLabel = authBookmark.querySelector('.exl-tooltip-label');
    const bookmarkAuthedToolTipIcon = authBookmark.querySelector('.bookmark-icon');
    loadJWT().then(async () => {
      profile().then(async (data) => {
        if (data.bookmarks.includes(bookmarkId)) {
          bookmarkAuthedToolTipIcon.classList.add('authed');
          bookmarkAuthedToolTipLabel.innerHTML = `${placeholders.bookmarkAuthLabelRemove}`;
        }
      });

      renderBookmark(bookmarkAuthedToolTipLabel, bookmarkAuthedToolTipIcon, bookmarkId);
    });
  } else {
    block.appendChild(unAuthBookmark);
  }
}

async function decorateCopyLink(block) {
  const copyLinkDivNode = document.createElement('div');
  copyLinkDivNode.className = 'copy-link';
  copyLinkDivNode.innerHTML = tooltipTemplate('copy-icon', 'copy page url', `${placeholders.toastTiptext}`);

  block.appendChild(copyLinkDivNode);
  attachCopyLink(copyLinkDivNode, window.location.href, placeholders.toastSet);
}

async function decorateBookmarkAndCopy(block) {
  await decorateBookmark(block);
  await decorateCopyLink(block);
}

async function createOptions(container, readTimeText) {
  const options = document.createElement('div');
  options.classList.add('article-marquee-options');
  await decorateBookmarkAndCopy(options, placeholders);

  const lastUpdated = document.createElement('div');
  const lastUpdatedData = document.querySelector('meta[name="published-time"]').getAttribute('content');
  const date = new Date(lastUpdatedData);
  lastUpdated.classList.add('article-marquee-lu');
  lastUpdated.textContent = `Last Updated:${date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}`;

  const readTime = document.createElement('div');
  readTime.classList.add('article-marquee-rt');
  readTime.innerHTML = `<span class="icon icon-time"></span> <span>${readTimeText} read</span>`;

  container.appendChild(options);
  container.appendChild(lastUpdated);
  container.appendChild(readTime);
}

function createBreadcrumb(container) {
  // get current page path
  const currentPath = getEDSLink(document.location.pathname);

  // split the path at browse root
  const browseRootName = 'article';
  const pathParts = currentPath.split(browseRootName);
  // prefix language path
  const browseRoot = `${pathParts[0]}${browseRootName}`;

  // set the root breadcrumb
  const rootCrumbElem = document.createElement('a');
  rootCrumbElem.appendChild(createPlaceholderSpan('article', 'Article'));
  rootCrumbElem.setAttribute('href', getLink(browseRoot));
  container.append(rootCrumbElem);

  // TODO : Rest of breadcrumb
}

/**
 * @param {HTMLElement} block
 */
export default async function ArticleMarquee(block) {
  const [authorImg, authorName, authorTitle, readTime, headingType] = block.querySelectorAll(':scope div > div');

  let tagname = 'By Adobe';
  const ArticleType = document.querySelector('meta[name="article-theme"]').getAttribute('content');
  if (ArticleType !== 'adobe') {
    tagname = 'By you';
  }
  const articleDetails = `<div class="am-container"><div class="am-article-info">
                                <div class="breadcrumb"></div>
                                <${headingType.textContent}>${document.title}</${headingType.textContent}>
                                <div class="article-marquee-info"></div>
                            </div>
                            <div class="am-author-info">
                            ${authorImg.outerHTML} 
                            <div>By ${authorName.textContent.trim()}</div> 
                            ${authorTitle.outerHTML}
                            <div class="am-tag">${tagname}</div>
                            </div></div>
                            <div class="am-bg ${ArticleType}"></div>
                            `;
  block.innerHTML = articleDetails;
  const infoContainer = block.querySelector('.article-marquee-info');
  await createOptions(infoContainer, readTime.textContent.trim());

  const breadcrumbContainer = block.querySelector('.breadcrumb');
  createBreadcrumb(breadcrumbContainer);
  decorateIcons(block);
}
