import type { PostArticleData } from "./types";

import { post as postHowToCleanBathroomWalls } from "./how-to-clean-bathroom-walls";
import { post as postHowToCleanCabinetsBeforePainting } from "./how-to-clean-cabinets-before-painting";
import { post as postHowToCleanBathroomCountertops } from "./how-to-clean-bathroom-countertops";
import { post as postGuideToBasementCleaningServicesNearYou } from "./guide-to-basement-cleaning-services-near-you";
import { post as postCleaningCoRedefiningCleaningStandards } from "./cleaning-co-redefining-cleaning-standards";
import { post as postWhenYouHireACompanyForDeepCleaningYourHouseDoYouTipTheWorkersToo } from "./when-you-hire-a-company-for-deep-cleaning-your-house-do-you-tip-the-workers-too";
import { post as postDoINeedToBeHomeDuringADeepCleaningService } from "./do-i-need-to-be-home-during-a-deep-cleaning-service";
import { post as post10QuestionsToAskHouseCleaningServicesAComprehensiveGuide } from "./10-questions-to-ask-house-cleaning-services-a-comprehensive-guide";
import { post as postWhatIsIncludedInADeepCleaningOfAHouse } from "./what-is-included-in-a-deep-cleaning-of-a-house";

export type { Inline, ArticleBlock, PostArticleData } from "./types";

// Every post the site links to, keyed by root-level slug. how-to-clean-smoke-detectors and what-to-do-in-st-louis-park-mn
// are bespoke Elementor pages on live, not this template, so they are absent here.
export const posts: Record<string, PostArticleData> = {
  "how-to-clean-bathroom-walls": postHowToCleanBathroomWalls,
  "how-to-clean-cabinets-before-painting": postHowToCleanCabinetsBeforePainting,
  "how-to-clean-bathroom-countertops": postHowToCleanBathroomCountertops,
  "guide-to-basement-cleaning-services-near-you": postGuideToBasementCleaningServicesNearYou,
  "cleaning-co-redefining-cleaning-standards": postCleaningCoRedefiningCleaningStandards,
  "when-you-hire-a-company-for-deep-cleaning-your-house-do-you-tip-the-workers-too": postWhenYouHireACompanyForDeepCleaningYourHouseDoYouTipTheWorkersToo,
  "do-i-need-to-be-home-during-a-deep-cleaning-service": postDoINeedToBeHomeDuringADeepCleaningService,
  "10-questions-to-ask-house-cleaning-services-a-comprehensive-guide": post10QuestionsToAskHouseCleaningServicesAComprehensiveGuide,
  "what-is-included-in-a-deep-cleaning-of-a-house": postWhatIsIncludedInADeepCleaningOfAHouse,
};

export const postSlugs = Object.keys(posts);
