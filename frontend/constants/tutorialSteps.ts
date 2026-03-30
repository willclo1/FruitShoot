export type TutorialStepConfig = {
  id: string;
  route?: string;
  targetId?: string;
  placement?: "top" | "bottom" | "center";
  title: string;
  description: string;
  highlightLabel: string;
  instruction?: string;
  narration?: string;
};

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: "welcome",
    route: "/",
    placement: "center",
    title: "Welcome to FruitShoot",
    description:
      "Analyze fruit ripeness instantly, discover the perfect recipes, and reduce food waste. Let's explore the key features.",
    highlightLabel: "App Overview",
    instruction: "Tap Next to learn about each feature.",
  },
  {
    id: "scan-fruit",
    route: "/",
    targetId: "home-upload-button",
    placement: "top",
    title: "Scan Your Fruit",
    description:
      "Take a photo or upload an image of any fruit. Our AI analyzes ripeness level and gives you instant insights.",
    highlightLabel: "Upload Picture",
    instruction: "Start here to begin analyzing fruit.",
  },
  {
    id: "ripeness-results",
    route: "/",
    placement: "center",
    title: "Ripeness Results",
    description:
      "After scanning, you'll see detailed ripeness information. The app shows color, firmness, and ripeness stage to help you decide what to cook or when to eat it.",
    highlightLabel: "Analysis Results",
    instruction: "Results appear instantly after scanning.",
  },
  {
    id: "create-recipes",
    route: "/",
    placement: "center",
    title: "Create Recipes",
    description:
      "Build your own recipe cards with ingredients and step-by-step instructions. Perfect for storing family recipes or meal plans.",
    highlightLabel: "Recipe Creation",
    instruction: "Organize all your favorite recipes in one place.",
  },
  {
    id: "import-recipes",
    route: "/",
    placement: "center",
    title: "Import Recipes",
    description:
      "Paste a web recipe URL and instantly convert it to a digital card in your collection. Save recipes from anywhere on the internet.",
    highlightLabel: "Recipe Import",
    instruction: "Quickly build your recipe library from the web.",
  },
  {
    id: "saved-recipes",
    route: "/",
    placement: "center",
    title: "Saved Recipes",
    description:
      "Keep a personal collection of your favorite recipes. Bookmark recipes you love and access them anytime from the Recipes tab.",
    highlightLabel: "Recipe Library",
    instruction: "Organize and find your recipes quickly.",
  },
  {
    id: "explore-recipes",
    route: "/",
    placement: "center",
    title: "Explore Recommendations",
    description:
      "Discover curated recipes that match your fruit's ripeness level and trending community favorites. Find new dishes to try.",
    highlightLabel: "Recipe Exploration",
    instruction: "Get inspiration from personalized recommendations.",
  },
  {
    id: "settings",
    route: "/",
    targetId: "home-settings-button",
    placement: "top",
    title: "Customize Your Experience",
    description:
      "Adjust text size for readability, enable TEXT-TO-SPEECH narration, manage notifications, and personalize the app to match your preferences.",
    highlightLabel: "Settings & Preferences",
    instruction: "Tap Settings anytime to customize.",
  },
];
