
// global currentUser variable
let currentUser = null;

// wait til HTML is loaded before doing any of the functions within
// they're all dependednt upon responses from server, so await... its all async
$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $faveArticlesLoc = $('#favorited-articles');

  // global storyList variable
  let storyList = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    // line 109 in api-classes.js has User.login()
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */
  // Seeing Event Delegation, but... ***why not just use $('#nav-all')? it's on an <a>*** 
  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    // includes the h3 tag that says "loading..."
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup

    // re:star
    // line 169 is a solid star, 170 is an outline
    // will want to toggle between the two depending on a favorited value
    // OR ifFavorite that queries the database
    // deafault is to show outline
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <i class="fas fa-star favorite hidden"></i>
      <i class="far fa-star unfavorite"></i>
              <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `
      // re:star - could we add the check for favorited/myStories here?
      // if story.favorite then $(fas).show(), $(far).hide()
    );

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $('#main-nav-links').show();
    $('#nav-user-profile').text(currentUser.username);
    $('#nav-welcome').show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    // indexOf("multicharacter string") returns the index of the first character of that string
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  // currentUser is still a global variable...don't scroll up, it's there
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }


  $('#nav-submit').on("click", function () {
    $submitForm.slideToggle();
    $submitForm.show();
  })

  $submitForm.on("submit", async function handleFormSumission(evt) {
    // prevent form from immediately sending the values
    evt.preventDefault();

    // create a newStory object to feed into addStory
    let newStory = {};
    newStory.author = $('#author').val();
    newStory.title = $('#title').val();
    newStory.url = $('#url').val();

    // add the new story by calling addStory on the class StoryList
    await StoryList.addStory(newStory);

    // create a new instance of StoryList by invoking generateStories
    // this creates a new instance of StoryList, clears out the current allStoriesList section, 
    // recreates the HTML for each story and reappends it to the DOM one by one
    await generateStories();

    // reset the form and hide it by sliding it up
    $submitForm.trigger("reset");
    $submitForm.slideToggle();
  })

  // handles all things related to favorite-ing on the click of the <i>
  // #favorited-articles is ul in an article tag in HTML(line 56). constant created: $favArticles
  async function ifFavorite() {

    // sends GET request to server to see if storyID being populated to a list is ALSO in user favorites
    //  IF it is then hide <i> with 'far' and show the one with 'fas'
    // maybe a ternary condition for both? ----- .hidden ? .show() : .hide()
    async function showStar() {

    }


    // dbFavorites()
    // updates serverside status of favorites by appending or removing from array in user obj
    // 
  }
  ;



  //trying to make original generate stories @li 143 reworked for favorites
  async function generateFaveStories() {
    // get an instance of StoryList
    console.log(await currentUser);
    const userFaves = currentUser.favorites;
    // empty out that part of the page
    // includes the h3 tag that says "loading..."
    $faveArticlesLoc.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of userFaves) {
      const result = generateFaveStoryHTML(story);
      $faveArticlesLoc.append(result);
    }
    $faveArticlesLoc.show();
    $allStoriesList.hide();
  }


  /**
   * A function to render HTML for an current User Favorites
   */
  function generateFaveStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup

    // re:star
    // line 169 is a solid star, 170 is an outline
    const storyMarkup = $(`
    <li id="${story.storyId}">
    <i class="fas fa-star favorite"></i>
    <i class="far fa-star unfavorite hidden"></i>
            <a class="article-link" href="${story.url}" target="a_blank">
        <strong>${story.title}</strong>
      </a>
      <small class="article-author">by ${story.author}</small>
      <small class="article-hostname ${hostName}">(${hostName})</small>
      <small class="article-username">posted by ${story.username}</small>
    </li>
  `
      // re:star - could we add the check for favorited/myStories here?
      // if story.favorite then $(fas).show(), $(far).hide()
    );
    return storyMarkup;
  }


    // toggles star from clear to solid and vice versa in DOM
    $('body').on('click', '.favorite',  function handleUnfavoriteClick(evt) {
      console.log(evt.target);
      $(evt.target).hide();
      let unfavorited = /*$(`${evt.target} ~ .unfavorite`)*/ $(evt.target).siblings('i');
      unfavorited.show();
      let storyId = $(evt.target.parentNode).attr('id');
      // remove from currentUser.favorites
      // axios.delete();
    })

    $('body').on('click', '.unfavorite', async function handleFavoriteClick(evt) {
      console.log(evt.target);
      $(evt.target).hide();
      let favorited = /*$(`${evt.target} ~ .favorite`)*/ $(evt.target).siblings('i');
      favorited.show();
      let storyId = $(evt.target.parentNode).attr('id');
      // add to currentUser.favorites
      // axios.post();
      let username = currentUser.username;
      const token = localStorage.getItem("token");
      currentUser = await User.addFavorite(username, storyId, token);
    })



  //handles clicking the Favorites link in nav
  $('#nav-favorites').on('click', function () {
  console.log("clicking favorites");
  generateFaveStories();
  })
})