import { htmlToElement } from '../../../scripts/scripts.js';
import { loadCSS } from '../../../scripts/lib-franklin.js';

loadCSS(`${window.hlx.codeBasePath}../blocks/topic-results/filtered-results/filtered-results.css`);

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Creates a filtered result element based on the provided options.
 * @param {Object} options - The options for creating a filtered result.
 * @param {string} options.title - The title of the result.
 * @param {string} options.description - The description of the result.
 * @param {string} options.productName - The product name associated with the result.
 * @param {string} options.contentType - The content type of the result.
 * @param {string} options.dateUpdated - The date the result was last updated.
 * @returns {HTMLElement} The filtered result element.
 */
function createFilteredResult({
  title = '',
  description = '',
  copyLink = '',
  product = [],
  contentType = [],
  date = '',
  thumbnail = '',
  video_url: videoUrl = '',
}) {
  const truncatedDescription = description.length > 150 ? `${description.slice(0, 150)}...` : description;
  const formattedDate = date ? new Date(date).toISOString().split('T')[0] : 'Date not available';

  // Determine the class for the content type
  let contentTypeClass = '';
  contentTypeClass = contentType?.toLowerCase() || '';

  let iconSrc = '';
  switch (contentType.toLowerCase()) {
    case 'tutorial':
      contentTypeClass = 'tutorial';
      iconSrc = '../icons/tutorial.svg';
      break;
    case 'documentation':
      contentTypeClass = 'documentation';
      iconSrc = '../icons/documentation.svg';
      break;
    case 'community':
      contentTypeClass = 'community';
      iconSrc = '../icons/community.svg';
      break;
    case 'event':
      contentTypeClass = 'event';
      iconSrc = '../icons/event.svg';
      break;
    case 'troubleshooting':
      contentTypeClass = 'troubleshooting';
      iconSrc = '../icons/troubleshooting.svg';
      break;
    default:
      contentTypeClass = '';
      iconSrc = '';
  }

  return htmlToElement(`
<div class="filtered-result-content">
    <div class="filtered-result-left-container ${!!videoUrl && 'thumbnail'}">
            <div class="filtered-result-title-description-container">
                <div class="filtered-result-title-container">
                    <a href="${copyLink}" >
                        <h4 class="filtered-result-title">
                            ${title}
                        </h4>
                    </a>
                </div>
                <div class="filtered-result-description">${truncatedDescription}</div>
            </div>
            <a class="filtered-result-video" href="${videoUrl}">
                <img src="${thumbnail}" alt="Video Preview">
            </a>
          
    </div>
    <div class="filtered-result-right-container">
        <div class="filtered-result-product-content-type-container">
            <div class="filtered-result-product-name">${product}</div>
            <div class="filtered-result-content-type ${contentTypeClass}">
            <img src="${iconSrc}" alt="${contentType} icon">
                <span>${capitalizeFirstLetter(contentTypeClass)}</span>
            </div>
        </div>
        <div class="filtered-result-date-container"> 
            <div class="filtered-result-date">${formattedDate}</div>
        </div>
    </div>
</div>
`);
}

/**
 * Populates the block with filtered results based on the selected content type.
 * @param {HTMLElement} block - The block to populate with filtered results.
 * @param {Array|Object} results - The results to display, can be a single object or an array of objects.
 */
function populateFilteredResults(block, results) {
  const processedResults = Array.isArray(results) ? results : [results];

  let resultsContainer = block.querySelector('.filtered-results-container');
  if (!resultsContainer) {
    resultsContainer = document.createElement('div');
    resultsContainer.className = 'filtered-results-container';
    block.appendChild(resultsContainer);
  } else {
    resultsContainer.innerHTML = '';
  }

  processedResults.forEach((result) => {
    resultsContainer.appendChild(createFilteredResult(result));
  });
}

export { createFilteredResult, populateFilteredResults };
