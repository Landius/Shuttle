# Shuttle

A firefox addon that helps with switching proxies by the host of page.

## What does it do

The major difference between Shuttle and other proxy addons is that Shuttle uses a different strategy to handle cross site request.

Many addons handle requests just based on the urls they are sending.
But Shuttle analyses which tab the request comes from, then chooses proxy based on the url of the tab.

Let's say we got 2 rules in a proxy profile: [ a.com => proxy1, b.com => proxy2 ].
Normally in other addons, all requests sending to `a.com` will use proxy1, and all requests sending to `b.com` will use proxy2.
But in Shuttle, all requests from the `a.com` page will use proxy1, even if they are sent to `b.com`.

## How it works

Shuttle uses the tabId of a request to find it's source tab, then choose proxy based on url of this tab.
But there're 2 exceptions:

- the tabId is invalid. It means the request is sent by the browser itself.
- when users create a tab, the initial url of this tab is always `about:blank`.

With the 2 exceptions above, Shuttle will handle proxy by request's url instead of source tab's url.

## todo

- [ ] bypass list
- [ ] about page.
  - [ ] A basic usage about this addon (open after addon installed)
  - [ ] license, project url, reference...
  - [ ] support localization.

- bug
  - [ ] does request of service worker have tab id?

## note

- sometimes requests were failed because they are blocked by adblock addons or browser privacy protection.
- it's recommended to enable proxyDNS for socks proxy to avoid domain pollution.

## resources

- icon: firefox photon design icon [link](https://design.firefox.com/icons/viewer/).
- vanilla javascript
- browser extension API.
