const { Plugin } = require("@vizality/entities");
const { React, getModule } = require("@vizality/webpack");
const { push: openModal } = require("@vizality/webpack").modal;
const {
	react: { findInReactTree },
} = require("@vizality/util");
const { patch, unpatch } = require("@vizality/patcher");
const ReactionBuilderModal = require("./components/ReactionBuilderModal");
const MiniPopover = getModule(
	(m) => m.default && m.default.displayName === "MiniPopover"
);
const TextReactButton = require("./components/TextReactButton")(MiniPopover);
const { getMessage, getMessages } = getModule("getMessages");
const { getChannel } = getModule("getChannel");
const { getChannelId } = getModule("getLastSelectedChannelId");
const DiscordPermissions = getModule("Permissions").Permissions;
const Permissions = getModule("getHighestRole");

const reactions = {
	multiple: {
		wc: ["🚾"],
		back: ["🔙"],
		end: ["🔚"],
		"on!": ["🔛"],
		soon: ["🔜"],
		top: ["🔝"],
		"!!": ["‼"],
		"!?": ["⁉"],
		tm: ["™"],
		10: ["🔟"],
		cl: ["🆑"],
		cool: ["🆒"],
		free: ["🆓"],
		id: ["🆔"],
		new: ["🆕"],
		ng: ["🆖"],
		ok: ["🆗"],
		sos: ["🆘"],
		"up!": ["🆙"],
		vs: ["🆚"],
		abc: ["🔤"],
		ab: ["🆎"],
		18: ["🔞"],
		100: ["💯"],
	},
	single: {
		a: ["🇦", "🅰"],
		b: ["🇧", "🅱"],
		c: ["🇨", "©"],
		d: ["🇩"],
		e: ["🇪", "📧"],
		f: ["🇫"],
		g: ["🇬"],
		h: ["🇭", "♓"],
		i: ["🇮", "ℹ"],
		j: ["🇯"],
		k: ["🇰"],
		l: ["🇱"],
		m: ["🇲", "Ⓜ️", "♏", "♍"],
		n: ["🇳", "♑"],
		o: ["🇴", "🅾", "⭕"],
		p: ["🇵", "🅿"],
		q: ["🇶"],
		r: ["🇷", "®"],
		s: ["🇸"],
		t: ["🇹", "✝️"],
		u: ["🇺"],
		v: ["🇻", "♈"],
		w: ["🇼"],
		x: ["🇽", "❎", "❌", "✖"],
		y: ["🇾"],
		z: ["🇿"],
		0: ["0️⃣"],
		1: ["1️⃣"],
		2: ["2️⃣"],
		3: ["3️⃣"],
		4: ["4️⃣"],
		5: ["5️⃣"],
		6: ["6️⃣"],
		7: ["7️⃣"],
		8: ["8️⃣"],
		9: ["9️⃣"],
		"?": ["❔", "❓"],
		"+": ["➕"],
		"-": ["➖", "⛔", "📛"],
		"!": ["❕", "❗"],
		"*": ["*️⃣"],
		$: ["💲"],
		"#": ["#️⃣"],
		" ": ["▪️", "◾", "➖", "◼️", "⬛", "⚫", "🖤", "🕶️"],
	},
};

let allReactions = [];
for (let i = 0; i < Object.keys(reactions.multiple).length; i++) {
	let reactionName = Object.keys(reactions.multiple)[i];
	let reactionValues = reactions.multiple[reactionName];
	allReactions = allReactions.concat(reactionValues);
}
for (let i = 0; i < Object.keys(reactions.single).length; i++) {
	let reactionName = Object.keys(reactions.single)[i];
	let reactionValues = reactions.single[reactionName];
	allReactions = allReactions.concat(reactionValues);
}

module.exports = class TextReact extends (
	Plugin
) {
	async onStart() {
		this.injectStyles("style.css");

		patch("text-react", MiniPopover, "default", (_, res) => {
			const props = findInReactTree(res, (r) => r && r.canReact && r.message);
			if (!props) return res;
			const message = getMessage(props.channel.id, props.message.id);
			const channel = getChannel(props.channel.id);

			if (this._canReact(channel)) {
				res.props.children.unshift(
					React.createElement(TextReactButton, {
						...props,
						channel,
						message,
						reactions,
						allReactions,
					})
				);
			}
			return res;
		});
		MiniPopover.default.displayName = "MiniPopover";

		vizality.api.commands.registerCommand({
			command: "react",
			aliases: [],
			description: "React on a message with regional indicators",
			usage: "{c} [message id] [channel id]",
			executor: async (args) => {
				let messageid = args[0],
					channelid = args[1] || getChannelId();
				if (!messageid) {
					const messages = getMessages(channelid)._array;
					if (messages.length == 0) {
						return {
							send: false,
							result:
								"Could not get last message ID, please enter message ID manually.",
						};
					}
					messageid = messages[messages.length - 1].id;
				}
				if (!getMessage(channelid, messageid)) {
					return {
						send: false,
						result: `Could not find a message with the ID \`${messageid}\`.`,
					};
				}

				const message = getMessage(channelid, messageid);
				const channel = getChannel(channelid);

				if (!this._canReact(channel))
					return {
						result: `You don't have permissions to react in <#${channelid}> channel`,
					};

				setTimeout(() => {
					openModal(() =>
						React.createElement(ReactionBuilderModal, {
							channel,
							message,
							reactions,
							allReactions,
						})
					);
				}, 0);
			},
		});
	}

	onStop() {
		unpatch("text-react");
		vizality.api.commands.unregisterCommand("react");
		document
			.querySelectorAll(".text-react-button")
			.forEach((e) => (e.style.display = "none"));
	}

	_canReact(channel) {
		return (
			Permissions.can(DiscordPermissions.ADD_REACTIONS, channel) ||
			channel.type == 1 || // DM
			channel.type == 3
		); // Group DM
	}
};
