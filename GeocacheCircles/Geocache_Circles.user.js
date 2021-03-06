// ==UserScript==
// @name        Geocache Circles
// @namespace   inge.org.uk/userscripts
// @description Allows you to display a 0.1 mile radius circle around a cache on the Geocaching.com map page
// @match       https://www.geocaching.com/map*
// @author      JRI
// @oujs:author JRI
// @license     MIT; http://www.opensource.org/licenses/mit-license.php
// @copyright   2016-2017, James Inge (http://geo.inge.org.uk/)
// @version     0.0.5
// @icon        https://geo.inge.org.uk/userscripts/circleIcon48.png
// @icon64      https://geo.inge.org.uk/userscripts/circleIcon64.png
// @connect     www.geocaching.com
// @updateURL   https://geo.inge.org.uk/userscripts/Geocache_Circles.meta.js
// @downloadURL https://openuserjs.org/install/JRI/Geocache_Circles.user.js
// ==/UserScript==

/*jslint browser:true */
/*jshint esversion: 6, undef:true, unused:true */
/*global L, MapSettings, window, console */

(function() {
	"use strict";
	const version = "Geocache Circles v0.0.5";
	const loggedIn = document.getElementById("uxLoginStatus_divSignedIn");
	const template = document.getElementById("cacheDetailsTemplate");
	const script = document.createElement("script");
	const circleIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA6UlEQVQ4ja2TsY3DMAxFiUvvbOTaA0SVRhBEfooyBLjyON7FC3iVNNYVlwB3MQwH5/xW/A/8FEm0I+99E4K0IUjrvW/26jaKETeILZC0KqwqrELSCrElRtx2jaWUq0iaFFaBPKvawMwdM3eqNgB5VlgVSVMp5boBPMx3ibkfx/Hr9d05d5GYe4XdRdK0aVthVWLujyI+IPVPHIgtQJ6dc5cjgHPuAuQZYgsR/UwbklZVG47MT6naAEmr976hEKRVWGXm7l0AM3cKqyFIex5wOgLRySESfeAbiU4uEtEHVvl3nH8d06vePedvYUbM9ZMTrS4AAAAASUVORK5CYII=";

	//delete existing circle
	function handleCircleRemove(e) {
		const gc = e.detail;
		if (window.MapSettings && MapSettings.Map && window.L && circleStorage[gc]) {
			{
				MapSettings.Map.removeLayer(circleStorage[gc]);
				delete circleStorage[gc];
			}
		}
	}

	function handleCircleRequest(e) {
		/* Fetch coordinates from cache page */
		const req = new XMLHttpRequest();
		const gc = e.detail;

		//if circle exists, delete it
		if (circleStorage[gc] && window.MapSettings && MapSettings.Map && window.L && window.L.Circle) {
			MapSettings.Map.removeLayer(circleStorage[gc]);
			delete circleStorage[gc];
			return;
		}

		req.addEventListener("load", function(ignore) {
			const r = req.responseText;
			const k = r.indexOf("mapLatLng = {");



			if (req.status < 400) {
				try {
					const { lat, lng, name } = JSON.parse(r.substring(k + 12, r.indexOf("}", k) + 1));

					if (typeof lat !== "number" || typeof lng !== "number") {
						// Missing data in JSON string
						console.error("Geocache Circles: no cache coordinates retrieved.");
						return;
					}

					if (window.MapSettings && MapSettings.Map && window.L && window.L.Circle) {
						const ll = new L.LatLng(lat, lng);
						var circle = new L.Circle(ll, 161, { weight: 2 });
						circle.addTo(MapSettings.Map)
							.bindPopup(`<p><strong>${name}</strong><br/>${ll.toUrl()}<br/>
								<a href="https://www.geocaching.com/geocache/${gc}" target="_blank">OpenCache</a><br>
								<a style="cursor: pointer;" onclick="document.dispatchEvent(new CustomEvent('gme_circle_remove', {'detail':'${gc}'}));">Remove circle</a>`);
						circleStorage[gc] = circle;
					} else {
						console.error("Geocache Circles: couldn't find map interface.");
					}
				} catch (err) {
					if (err instanceof SyntaxError) {
						console.warn(`Geocache Circles: Received ${r.length} bytes, coords at ${k} but couldn't extract cache coordinates from data (are you still logged in?):
${err}`);
					} else {
						console.error(`Geocache Circles: couldn't add circle to ssmap: ${err}`);
					}
				}
			} else {
				console.warn(`Geocache Circles: error retrieving cache page to find coords for ${gc}: ${req.statusText}`);
			}
		});
		req.open("GET", `https://www.geocaching.com/geocache/${gc}`);
		req.send();
	}

	// Don't run on frames or iframes
	if (window.top !== window.self) {
		return false;
	}

	// Check feature support
	if (!window.JSON || !window.XMLHttpRequest) {
		console.warn(`${version} requires a browser with support for JSON and XMLHttpRequest`);
		return false;
	}

	if (loggedIn === null) {
		// Warn if not logged in, as coords unavailable.  Don't quit, as user might log in later in a different window, or login detection might have failed.
		console.warn("Geocache Circles may not be able to locate caches as you don't seem to be logged in.");
	}

	if (template) {
		console.info(version);

		// Attach to cache info popup template
		template.textContent = template.textContent.replace(/<div\sclass="links\sClear">/, `<div class="links Clear"> <a class="jri-circle-link" style="cursor: pointer; text-decoration: underline;" onclick="document.dispatchEvent(new CustomEvent('gme_circle_request', {'detail':'{{=gc}}'}));"><img src="${circleIcon}" alt="O" style="vertical-align:middle; margin-right: 0.25em;" width="16" height="16" />Circle</a>&nbsp; `);

		// Add event listener to content script context
		script.type = "text/javascript";
		script.text = `"use strict";
			const circleStorage = {};
			${handleCircleRequest.toString()}
			${handleCircleRemove.toString()}
          document.addEventListener("gme_circle_request", handleCircleRequest, false);
          document.addEventListener("gme_circle_remove", handleCircleRemove, false)`;
		document.documentElement.firstChild.appendChild(script);
		document.documentElement.firstChild.removeChild(script);
	} else {
		// Couldn't find popup template
		console.error(`${version} didn't understand page structure.`);
	}
}());
