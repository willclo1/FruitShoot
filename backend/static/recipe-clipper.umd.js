(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.RecipeClipper = {}));
})(this, (function (exports) { 'use strict';

  const generateConfig = options => {
    // Default structure
    const config = {
      window: null,
      options: {
        window: null,
        mlDisable: null,
        mlModelEndpoint: null,
        mlClassifyEndpoint: null,
        ignoreMLClassifyErrors: null
      }
    };

    // Window-based options
    /* istanbul ignore next */
    try {
      if (window) {
        config.window = window;
        config.options.window = window;
        config.options.mlDisable = window.RC_ML_DISABLE || null;
        config.options.mlModelEndpoint = window.RC_ML_MODEL_ENDPOINT || null;
        config.options.mlClassifyEndpoint = window.RC_ML_CLASSIFY_ENDPOINT || null;
        config.options.ignoreMLClassifyErrors = window.RC_IGNORE_ML_CLASSIFY_ERRORS || null;
      }
    } catch (_) {
      // Do nothing
    }

    // Argument-based options
    if (options) {
      config.window = options.window || config.window;
      config.options = {
        ...config.options,
        ...options
      };
    }
    return config;
  };

  const generalBadWords = ['instructions', 'directions', 'procedure', 'preparation', 'method', 'you will need', 'how to make it', 'ingredients', 'total time', 'active time', 'prep time', 'time', 'yield', 'servings', 'notes', 'select all ingredients', 'select all'];
  const allRecipesBadWords = ['ingredient checklist', 'instructions checklist', 'decrease serving', 'increase serving', 'adjust', 'the ingredient list now reflects the servings specified', 'footnotes', 'i made it  print', 'add all ingredients to shopping list'];
  const tastyRecipesBadWords = ['scale 1x2x3x'];
  const badWords = [generalBadWords, allRecipesBadWords, tastyRecipesBadWords].flat();

  const matchYield = /(serves|servings|yield|yields|makes):?\s*\d+/i;
  const matchActiveTime = /(active time|prep time):?\s*(\d+ (d(s?)|day(s?)|hour(s?)|hr(s?)|minute(s?)|min(s?))? ?(and)? ?)+/i;
  const matchTotalTime = /(total time):?\s*(\d+ (d(s?)|day(s?)|hour(s?)|hr(s?)|minute(s?)|min(s?))? ?(and)? ?)+/i;

  // step 4:
  const matchStep = /^(step *)?\d+:?$/i;

  // 1x, 1 x
  const matchScale = /^\d+ *x?$/i;

  // total time:
  const matchFieldTitles = /^(total time|prep time|active time|yield|servings|serves):? ?/i;
  const matchSpecialChracters = /[^a-zA-Z0-9 ]/g;
  const ingredientSectionHeader = /^(ingredients|you will need|ingredient checklist|ingredient list)\s*:?/gi;
  const instructionSectionHeader = /^(instructions|instructions checklist|instruction list|how to make it|preparation|steps|method|procedure|directions)\s*:?/gi;

  const getLongestString = strings => strings.reduce((acc, el) => el.length > acc.length ? el : acc, '');
  const capitalizeEachWord = textBlock => textBlock.split(' ').map(word => `${word.charAt(0).toUpperCase()}${word.substring(1)}`).join(' ');
  const removeSpecialCharacters = line => line.replace(matchSpecialChracters, '').trim();

  // Undesired words
  const isBadWord = line => badWords.includes(removeSpecialCharacters(line).toLowerCase());

  // Digits and steps that sit on their own lines
  const isStep = line => removeSpecialCharacters(line).match(matchStep);

  // Scale buttons/interface that was picked up accidentally (4x)
  const isScale = line => removeSpecialCharacters(line).match(matchScale);
  const removeFieldTitles = line => line.replace(matchFieldTitles, '').trim();

  // Format capitalized lines "HEADER:" as [Header] or "for the xyz" as [For The Xyz]
  const formatHeaders = line => line.trim().match(/^([A-Z] *)+:?$/) || line.trim().match(/^for the ([a-z] *)+:?$/i) ? `[${capitalizeEachWord(line.trim().toLowerCase()).replace(':', '')}]` : line;
  const cleanKnownWords = textBlock => textBlock.split('\n').map(line => line.trim()).filter(line => removeSpecialCharacters(line).length).filter(line => !isBadWord(line)).filter(line => !isStep(line)).filter(line => !isScale(line)).map(line => removeFieldTitles(line)).map(line => formatHeaders(line)).join('\n');
  const format = {
    imageURL: val => val.trim(),
    title: val => capitalizeEachWord(val.trim().toLowerCase()),
    description: val => val.length > 300 ? '' : cleanKnownWords(val),
    source: val => val.trim(),
    yield: val => val.length > 30 ? '' : capitalizeEachWord(cleanKnownWords(val).trim().toLowerCase()),
    activeTime: val => val.length > 30 ? '' : capitalizeEachWord(cleanKnownWords(val).trim().toLowerCase()),
    totalTime: val => val.length > 30 ? '' : capitalizeEachWord(cleanKnownWords(val).trim().toLowerCase()),
    ingredients: val => cleanKnownWords(val),
    instructions: val => cleanKnownWords(val),
    notes: val => cleanKnownWords(val)
  };

  const getInnerText = element => element.innerText || element.textContent;

  const getClassNamesMatching = (window, classNamePartial) => {
    const classRegExp = new RegExp(`class="((\\w|\\s|-)*${classNamePartial}(\\w|\\s|-)*)"`, 'gi');
    const matches = window.document.body.innerHTML.matchAll(classRegExp);
    return Array.from(new Set(Array.from(matches, match => match[1])));
  };
  const getClassNamesContaining = (window, className) => {
    const classRegExp = new RegExp(`class="(([\\w-\\s]*\\s)?${className}(\\s[\\w-\\s]*)?)"`, 'gi');
    const matches = window.document.body.innerHTML.matchAll(classRegExp);
    return Array.from(new Set(Array.from(matches, match => match[1])));
  };
  const softMatchElementsByClass = (window, classNamePartial) => {
    const classNames = getClassNamesMatching(window, classNamePartial);
    return classNames.map(className => Array.from(window.document.getElementsByClassName(className))).flat();
  };
  const matchElementsByClass = (window, classNameFull) => {
    const classNames = getClassNamesContaining(window, classNameFull);
    return classNames.map(className => Array.from(window.document.getElementsByClassName(className))).flat();
  };
  const applyLIBlockStyling = element => {
    Array.from(element.querySelectorAll('li')).forEach(li => {
      li.style.display = 'block';
    });
    return element;
  };
  const grabLongestMatchByClasses = (window, preferredClassNames, fuzzyClassNames) => {
    const exactMatches = preferredClassNames.map(className => matchElementsByClass(window, className)).flat();
    const fuzzyMatches = fuzzyClassNames.map(className => softMatchElementsByClass(window, className)).flat();
    return (exactMatches.length > 0 ? exactMatches : fuzzyMatches).map(element => applyLIBlockStyling(element)).map(element => getInnerText(element).trim()).reduce((max, match) => match.length > max.length ? match : max, '');
  };
  const isImg = element => element.tagName.toLowerCase().trim() === 'img';
  const isPicture = element => element.tagName.toLowerCase().trim() === 'picture';
  const getAttrIfExists = (el, attrName) => {
    if (el.attributes[attrName]) return el.attributes[attrName].value;
    return '';
  };
  const getSrcFromImage = img => {
    if (!img) return '';
    const closestSrc = getAttrIfExists(img, 'data-src') || getAttrIfExists(img, 'data-lazy-src') || img.currentSrc || img.src;
    return closestSrc || '';
  };
  const isValidImage = element => isImg(element) && !!getSrcFromImage(element) && element.complete // Filter images that haven't completely loaded
  && element.naturalWidth > 0 // Filter images that haven't loaded correctly
  && element.naturalHeight > 0;
  const getImageDimensions = element => {
    const parent = element.parentNode;
    const isParentPicture = parent && isPicture(parent);
    const offsetHeight = isParentPicture ? Math.max(element.offsetHeight, parent.offsetHeight) : element.offsetHeight;
    const offsetWidth = isParentPicture ? Math.max(element.offsetWidth, parent.offsetWidth) : element.offsetWidth;
    return {
      offsetHeight,
      offsetWidth
    };
  };
  const grabLargestImage = window => {
    const matches = window.document.querySelectorAll('img');
    return [...matches].filter(element => isValidImage(element)).reduce((max, element) => {
      const {
        offsetWidth,
        offsetHeight
      } = getImageDimensions(element);

      // Do not use images smaller than 200x200
      if (offsetWidth < 200 && offsetHeight < 200) return max;
      const elTotalPx = offsetHeight * offsetWidth;
      const maxTotalPx = max ? max.offsetHeight * max.offsetWidth : 0;
      return elTotalPx > maxTotalPx ? element : max;
    }, null);
  };
  const closestToRegExp = (window, regExp) => {
    const {
      body
    } = window.document;
    const match = getInnerText(body).match(regExp);
    if (!match) return '';
    return match[0];
  };
  const grabRecipeTitleFromDocumentTitle = window => window.document.title.split(/ - |\|/)[0].trim();
  const grabSourceFromDocumentTitle = window => (window.document.title.split(/ - |\|/)[1] || '').trim();

  // Class matchers are sorted by field. Each field contains a set of exact matchers,
  // and a set of fuzzy fallback matchers
  // For example:
  // imageURL: [ [exact], [fuzzy fallback] ]
  // Clipper will search for exact matchers _exactly_ within the document
  // Clipper will search for any element that has a class that contains the fuzzy name

  const classMatchers = {
    imageURL: [['wprm-recipe-image',
    // Wordpress recipe embed tool - https://panlasangpinoy.com/leche-flan/
    'tasty-recipes-image',
    // TastyRecipes recipe embed tool - https://sallysbakingaddiction.com/quiche-recipe/
    'hero-photo',
    // AllRecipes - https://www.allrecipes.com/recipe/231244/asparagus-mushroom-bacon-crustless-quiche/
    'o-RecipeLead__m-RecipeMedia',
    // FoodNetwork - https://www.foodnetwork.com/recipes/paula-deen/spinach-and-bacon-quiche-recipe-2131172
    'recipe-lede-image',
    // Delish - https://www.delish.com/cooking/recipe-ideas/a25648042/crustless-quiche-recipe/
    'recipe-body',
    // Generic, idea from Delish - https://www.delish.com/cooking/recipe-ideas/a25648042/crustless-quiche-recipe/
    'recipe__hero',
    // Food52 - https://food52.com/recipes/81867-best-quiche-recipe
    'content' // Generic, recognize content-body if matched directly
    ], ['recipe-image', 'hero', 'recipe-content',
    // Generic, search for largest image within any recipe content block
    'recipe-body',
    // Generic, search for largest image within any recipe content block
    'recipe-intro',
    // Generic, search for largest image within any recipe content block
    'recipe-' // Generic, search for largest image within any recipe content block
    ]],

    title: [['wprm-recipe-name' // Wordpress recipe embed tool - https://panlasangpinoy.com/leche-flan/
    ], ['recipename', 'recipe-name', 'recipetitle', 'recipe-title']],
    description: [['wprm-recipe-summary' // Wordpress recipe embed tool - https://panlasangpinoy.com/leche-flan/
    ], []],
    yield: [['recipe-yield', 'recipe-servings', 'yield', 'servings'], ['yield', 'servings']],
    activeTime: [['wprm-recipe-prep_time',
    // Wordpress recipe embed tool - https://joyfoodsunshine.com/the-most-amazing-chocolate-chip-cookies/
    'activeTime', 'active-time', 'prep-time', 'time-active', 'time-prep'], ['activeTime', 'active-time', 'prep-time', 'time-active', 'time-prep']],
    totalTime: [['wprm-recipe-total_time',
    // Wordpress recipe embed tool - https://joyfoodsunshine.com/the-most-amazing-chocolate-chip-cookies/
    'totalTime', 'total-time', 'time-total'], ['totalTime', 'total-time', 'time-total']],
    ingredients: [['wprm-recipe-ingredients-container',
    // Wordpress recipe embed tool - https://panlasangpinoy.com/leche-flan/
    'wprm-recipe-ingredients',
    // Wordpress recipe embed tool - https://panlasangpinoy.com/leche-flan/
    'tasty-recipes-ingredients',
    // Tasty recipes embed tool - https://myheartbeets.com/paleo-tortilla-chips/
    'o-Ingredients',
    // FoodNetwork - https://www.foodnetwork.com/recipes/paula-deen/spinach-and-bacon-quiche-recipe-2131172
    'recipe-ingredients', 'recipe-ingredients-section',
    // Taste.com.au - https://www.taste.com.au/recipes/healthy-feta-mint-beef-patties-griled-vegies-hummus-recipe/pxacqmfu?r=recipes/dinnerrecipesfortwo&c=1j53ce29/Dinner%20recipes%20for%20two
    'ingredientlist', 'ingredient-list'], ['ingredients', 'ingredientlist', 'ingredient-list']],
    instructions: [['wprm-recipe-instructions',
    // Wordpress recipe embed tool - https://panlasangpinoy.com/leche-flan/
    'tasty-recipes-instructions',
    // Tasty recipes embed tool - https://myheartbeets.com/paleo-tortilla-chips/
    'recipe-directions__list',
    // AllRecipes - https://www.allrecipes.com/recipe/231244/asparagus-mushroom-bacon-crustless-quiche/
    'o-Method',
    // FoodNetwork - https://www.foodnetwork.com/recipes/paula-deen/spinach-and-bacon-quiche-recipe-2131172
    'steps-area',
    // Bon Appetit - https://www.bonappetit.com/recipe/chocolate-babka
    'recipe-method-section',
    // Taste.com.au - https://www.taste.com.au/recipes/healthy-feta-mint-beef-patties-griled-vegies-hummus-recipe/pxacqmfu?r=recipes/dinnerrecipesfortwo&c=1j53ce29/Dinner%20recipes%20for%20two

    'recipe__list--steps',
    // Food52.com - https://food52.com/recipes/81867-best-quiche-recipe
    'recipesteps',
    // BettyCrocker.com - https://www.bettycrocker.com/recipes/ultimate-chocolate-chip-cookies/77c14e03-d8b0-4844-846d-f19304f61c57
    'recipe-steps',
    // Generic
    'instructionlist',
    // Generic
    'instruction-list',
    // Bon Appetit - https://www.bonappetit.com/recipe/extra-corny-cornbread-muffins
    'directionlist',
    // Generic
    'direction-list',
    // https://leitesculinaria.com/10114/recipes-portuguese_sausage_frittata.html
    'preparationsteps',
    // Generic
    'preparation-steps',
    // https://www.maangchi.com/recipe/kimchi-bokkeumbap
    'prepsteps',
    // Generic
    'prep-steps',
    // https://tasty.co/recipe/one-pan-baby-back-ribs
    'recipeinstructions',
    // Generic
    'recipe-instructions',
    // Generic
    'recipemethod',
    // Generic
    'recipe-method',
    // Generic
    'directions',
    // Generic
    'instructions' // Generic
    ], ['instructionlist', 'instruction-list', 'preparationsteps', 'preparation-steps', 'directionlist', 'direction-list', 'recipesteps', 'recipe-steps', 'recipemethod', 'recipe-method', 'directions', 'instructions']],
    notes: [['notes',
    // Generic
    'recipenotes',
    // Generic
    'recipe-notes',
    // Generic
    'recipefootnotes',
    // Generic
    'recipe-footnotes',
    // Generic
    'recipe__tips',
    // King Arthur Flour - https://www.kingarthurflour.com/recipes/chocolate-cake-recipe
    'wprm-recipe-notes' // Wordpress recipe embed tool - https://panlasangpinoy.com/leche-flan/
    ], ['recipenotes', 'recipe-notes', 'recipefootnotes', 'recipe-footnotes']]
  };

  // Self import for mock
  const getDocumentContent = config => {
    const {
      body
    } = config.window.document;
    applyLIBlockStyling(body);
    return getInnerText(body).split('\n').map(line => line.trim()).filter(line => line);
  };
  const findPotentialSetsByHeader = (config, headerRegexp) => {
    const content = getDocumentContent(config);
    return content.filter(line => line.match(headerRegexp)).map(line => content.slice(content.indexOf(line) + 1));
  };
  const loadModel = async config => {
    const modelUrl = config.options.mlModelEndpoint;
    if (!modelUrl) throw new Error('You must provide window.RC_ML_MODEL_ENDPOINT or options.mlModelEndpoint to use local classification');
    return config.window.tf.loadLayersModel(modelUrl);
  };
  const mlClassifyLocal = async (config, lines) => {
    const model = await loadModel(config);
    const useModel = await config.window.use.load();
    const predictions = [];
    for (let i = 0; i < lines.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const encodedData = await useModel.embed([lines[i]]);
      const prediction = model.predict(encodedData).dataSync();
      predictions.push(prediction);
    }
    return predictions;
  };
  const mlClassifyRemote = async (config, lines) => {
    const remote = config.options.mlClassifyEndpoint;
    if (!remote) throw new Error('You must provide window.RC_ML_CLASSIFY_ENDPOINT or options.mlClassifyEndpoint to use remote classification');
    const response = await config.window.fetch(remote, {
      method: 'POST',
      body: JSON.stringify({
        sentences: lines
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  };
  const mlClassify = async (config, lines) => {
    const isTFJSAvailable = config.window.tf && config.window.tf.loadLayersModel;
    const isUSEAvailable = config.window.use && config.window.use.load;
    if (isTFJSAvailable && isUSEAvailable) return mlClassifyLocal(config, lines);
    return mlClassifyRemote(config, lines);
  };
  const mlFilter = async (config, lines, type) => {
    const predictions = await mlClassify(config, lines);
    let lastType = -1;
    const filteredOutput = [];
    for (let i = 0; i < lines.length; i += 1) {
      const predictedType = predictions[i].indexOf(Math.max(...predictions[i])) + 1;

      // Allow one line of error to be included
      // (say, an ingredient header or a stray bit of formatting)
      // Also allow some non-ingredient text at the very start (say, a section header)
      if (predictedType === type || lastType === type || i === 0) {
        filteredOutput.push(lines[i]);
        lastType = predictedType;
      } else {
        break;
      }
    }

    // Remove last element if it is not of the desired type
    // (consider our allowed buffer above may insert one undesired item at end)
    if (filteredOutput.length > 0 && lastType !== type) {
      filteredOutput.pop();
    }
    return filteredOutput;
  };
  const findFullSearch = async (config, type) => {
    const content = getDocumentContent(config);
    const predictions = await mlClassify(config, content);
    const {
      groups,
      workingGroup
    } = content.reduce((acc, line, idx) => {
      const predictedType = predictions[idx].indexOf(Math.max(...predictions[idx])) + 1;
      const lastType = acc.workingGroup && acc.workingGroup.length > 0 ? acc.workingGroup[acc.workingGroup.length - 1].type : -1;

      // Allow one line of error to be included in group
      // (say, an ingredient header or a stray bit of formatting)
      // Also allow some non-ingredient text at the very start (say, a section header)
      if (predictedType === type || lastType === type || idx === 0) {
        acc.workingGroup = acc.workingGroup || [];
        acc.workingGroup.push({
          text: line,
          type: predictedType
        });
      } else {
        // Group is considered complete
        if (acc.workingGroup && acc.workingGroup.length > 0) acc.groups.push(acc.workingGroup);
        acc.workingGroup = null;
      }
      return acc;
    }, {
      workingGroup: null,
      groups: []
    });

    // If leftover working group (if ingredients/instructions end at very end of page)
    if (workingGroup) groups.push(workingGroup);
    groups.forEach(group => {
      // Remove last element if it is not of the desired type
      // (consider our allowed buffer above may insert one undesired item at end)
      if (group.length > 0 && group[group.length - 1].type !== type) {
        group.pop();
      }
    });
    return groups.map(group => group.map(item => item.text)).map(group => group.join('\n')).reduce((a, b) => a.length > b.length ? a : b, '');
  };
  const findByHeader = async (config, type) => {
    const headerRegexp = type === 1 ? ingredientSectionHeader : instructionSectionHeader;
    const potentialSets = findPotentialSetsByHeader(config, headerRegexp);
    const sets = [];
    for (let i = 0; i < potentialSets.length; i += 1) {
      const potentialSet = potentialSets[i];
      // eslint-disable-next-line no-await-in-loop
      const set = await mlFilter(config, potentialSet, type);
      sets.push(set);
    }
    return sets.map(set => set.join('\n')).reduce((a, b) => a.length > b.length ? a : b, '');
  };
  const find = async (config, type) => {
    if (config.options.mlDisable) return '';
    const result = (await findByHeader(config, type)) || (await findFullSearch(config, type));
    return result;
  };

  // Type 1 for ingredients
  // Type 2 for instructions
  // Others to be implemented in future...
  const grabByMl = async (config, type) => {
    try {
      return await find(config, type);
    } catch (e) {
      if (config.options.ignoreMLClassifyErrors) {
        return '';
      }
      throw e;
    }
  };

  const getRecipeSchemasFromDocument = window => {
    const schemas = [...window.document.querySelectorAll('script[type="application/ld+json"]')].map(schema => {
      try {
        return JSON.parse(getInnerText(schema));
      } catch (e) {
        // Do nothing
      }
      return null;
    }).filter(e => e);
    const recipeSchemas = schemas.map(schema => {
      // Schemas that evaluate to a graph
      if (schema['@graph']) {
        return schema['@graph'].find(subSchema => subSchema['@type'] === 'Recipe');
      }

      // Schemas that are directly embedded
      if (schema['@type'] === 'Recipe') return schema;

      // Schemas that evaluate to an array
      if (schema.length && schema[0]) {
        return schema.find(subSchema => subSchema['@type'] === 'Recipe');
      }
      return null;
    }).filter(e => e);
    return recipeSchemas;
  };
  const getPropertyFromSchema = (window, propName) => {
    if (!window.parsedSchemas) window.parsedSchemas = getRecipeSchemasFromDocument(window);
    const foundSchema = window.parsedSchemas.find(schema => schema[propName]) || {};
    return foundSchema[propName] || null;
  };
  const getImageSrcFromSchema = window => {
    const images = getPropertyFromSchema(window, 'image');
    if (!images) return '';
    let imageSrc;
    if (typeof images === 'string') imageSrc = images;else if (typeof images.url === 'string') imageSrc = images.url;else if (typeof images[0] === 'string') [imageSrc] = images;else if (images[0] && typeof images[0].url === 'string') imageSrc = images[0].url;
    if (imageSrc) {
      try {
        const url = new URL(imageSrc);
        if (url.protocol === 'http:' || url.protocol === 'https:') return imageSrc;
      } catch (_) {
        // Do nothing
      }
    }
    return '';
  };
  const getTitleFromSchema = window => {
    const title = getPropertyFromSchema(window, 'name');
    if (typeof title === 'string') return title;
    return '';
  };
  const getDescriptionFromSchema = window => {
    const description = getPropertyFromSchema(window, 'description');
    if (typeof description === 'string') return description;
    return '';
  };
  const getYieldFromSchema = window => {
    const recipeYield = getPropertyFromSchema(window, 'recipeYield');
    if (!recipeYield) return '';
    if (typeof recipeYield === 'string') return recipeYield;
    if (typeof recipeYield[0] === 'string') return getLongestString(recipeYield);
    return '';
  };

  /**
   * Useful for breaking down:
   * Recipe.recipeIngredient (https://schema.org/recipeIngredient)
   * Recipe.recipeInstructions (https://schema.org/recipeInstructions)
   * Which can both often be provided as a string, array, or list of more objects within.
   */
  const getTextFromSchema = schema => {
    if (typeof schema === 'string') return schema;
    if (Array.isArray(schema)) {
      return schema.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          if (item.text) return item.text;
          if (item.itemListElement) return getTextFromSchema(item.itemListElement);
        }
        return undefined;
      }).filter(el => el !== null && el !== undefined).join('\n');
    }
    return '';
  };
  const getInstructionsFromSchema = window => {
    const instructions = getPropertyFromSchema(window, 'recipeInstructions');
    if (!instructions) return '';
    return getTextFromSchema(instructions);
  };
  const getIngredientsFromSchema = window => {
    const ingredients = getPropertyFromSchema(window, 'recipeIngredient');
    if (!ingredients) return '';
    return getTextFromSchema(ingredients);
  };

  /**
    * For each query passed, find all matching elements and takes the longest string match
    */
  const getLongestTextForQueries = (window, queries) => {
    const vals = queries.map(query => [...window.document.querySelectorAll(query)]).flat().map(el => getInnerText(el));
    return getLongestString(vals);
  };

  /**
    * For each query passed, find all matching elements and append them together.
    * Will take the longest match across each query, grouped.
    */
  const getLongestGroupTextForQueries = (window, queries) => {
    const vals = queries.map(query => [...window.document.querySelectorAll(query)]).map(els => els.map(el => getInnerText(el)).join('\n'));
    return getLongestString(vals);
  };
  const getDescriptionFromMicrodata = window => getLongestTextForQueries(window, ['[itemProp=description]']);
  const getActiveTimeFromMicrodata = window => getLongestTextForQueries(window, ['[itemProp=prepTime]']);
  const getTotalTimeFromMicrodata = window => getLongestTextForQueries(window, ['[itemProp=totalTime]']);
  const getYieldFromMicrodata = window => getLongestTextForQueries(window, ['[itemProp=recipeYield]']);
  const getInstructionsFromMicrodata = window => getLongestGroupTextForQueries(window, ['[itemProp=recipeInstructions]', '[itemProp=instructions]']);
  const getIngredientsFromMicrodata = window => getLongestGroupTextForQueries(window, ['[itemProp=recipeIngredients]', '[itemProp=ingredients]']);

  const clipImageURL = config => format.imageURL(getImageSrcFromSchema(config.window) || getSrcFromImage(grabLargestImage(config.window)));
  const clipTitle = config => format.title(getTitleFromSchema(config.window) || grabLongestMatchByClasses(config.window, ...classMatchers.title) || grabRecipeTitleFromDocumentTitle(config.window));
  const clipDescription = config => format.description(getDescriptionFromSchema(config.window) || getDescriptionFromMicrodata(config.window) || grabLongestMatchByClasses(config.window, ...classMatchers.description));
  const clipSource = config => format.source(grabSourceFromDocumentTitle(config.window) || config.window.location.hostname);
  const clipYield = config => format.yield(getYieldFromSchema(config.window) || getYieldFromMicrodata(config.window) || grabLongestMatchByClasses(config.window, ...classMatchers.yield) || closestToRegExp(config.window, matchYield).replace('\n', ''));
  const clipActiveTime = config => format.activeTime(getActiveTimeFromMicrodata(config.window) || grabLongestMatchByClasses(config.window, ...classMatchers.activeTime) || closestToRegExp(config.window, matchActiveTime).replace('\n', ''));
  const clipTotalTime = config => format.totalTime(getTotalTimeFromMicrodata(config.window) || grabLongestMatchByClasses(config.window, ...classMatchers.totalTime) || closestToRegExp(config.window, matchTotalTime).replace('\n', ''));
  const clipIngredients = async config => format.ingredients(getIngredientsFromSchema(config.window) || getIngredientsFromMicrodata(config.window) || grabLongestMatchByClasses(config.window, ...classMatchers.ingredients)) || format.ingredients(await grabByMl(config, 1));
  const clipInstructions = async config => format.instructions(getInstructionsFromSchema(config.window) || getInstructionsFromMicrodata(config.window) || grabLongestMatchByClasses(config.window, ...classMatchers.instructions)) || format.instructions(await grabByMl(config, 2));
  const clipNotes = config => format.notes(grabLongestMatchByClasses(config.window, ...classMatchers.notes));

  const clipRecipe = async options => {
    const config = generateConfig(options);
    return {
      imageURL: clipImageURL(config),
      title: clipTitle(config),
      description: clipDescription(config),
      source: clipSource(config),
      yield: clipYield(config),
      activeTime: clipActiveTime(config),
      totalTime: clipTotalTime(config),
      ingredients: await clipIngredients(config),
      instructions: await clipInstructions(config),
      notes: clipNotes(config)
    };
  };

  exports.clipRecipe = clipRecipe;

}));
//# sourceMappingURL=recipe-clipper.umd.js.map
