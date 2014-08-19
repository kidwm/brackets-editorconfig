(function () {
	"use strict";
	var editorconfig = require("./lib/editorconfig");
	function parse(path) {
		return editorconfig.parse(path);
	}
	/**
	 * Initializes the test domain with several test commands.
	 * @param {DomainManager} domainManager The DomainManager for the server
	 */
	function init(domainManager) {
		if (!domainManager.hasDomain("editorconfig")) {
			domainManager.registerDomain("editorconfig", {
				major: 0,
				minor: 1
			});
		}
		domainManager.registerCommand(
			"editorconfig", // domain name
			"parse", // command name
			parse, // command handler function
			false, // this command is synchronous in Node
			"Returns the editorconfig settings", [{
				name: "path", // parameters
				type: "string",
				description: "the file path"
			}], [{
				name: "config", // return values
				type: "json",
				description: "editorconfig values in json format"
			}]
		);
	}
	exports.init = init;
}());
