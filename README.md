# Shuttle

A firefox addon that helps with switching proxies by hostname

## todo

- feature
  - [ ] support username and password
  - [ ] show failed requests counting of current page in icon badge
  - [x] currently matching the hole hostname, considering add support for matching main hostname.
  - [ ] add bypass url list to profile.
  - [ ] option page.
  - [ ] improve page style.

- bug
  - [x] icon does not change until created tab load complete
  - [ ] can't get the url of a created tab immediately, need to listen to onUpdated event.
  - [ ] does worker request have a tab id?

## resources

- icon: firefox photon design icon [link](https://design.firefox.com/icons/viewer/).
- written in vanilla javascript with browser extension API.
