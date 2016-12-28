import {util} from '../../util';
import {Elements as CyphElements, elements as cyphElements} from '../elements';
import {nanoScroller} from '../nanoscroller';
import {visibilityWatcher} from '../visibilitywatcher';
import {Chat} from './chat';
import {IElements} from './ielements';


/**
 * Manages scrolling and scroll-detection within a chat component.
 */
export class ScrollManager {
	/** @ignore */
	private messageCountLock: {}	= {};

	/** @ignore */
	private scrollDownLocks: {
		cyphertext: {};
		messages: {};
	}	= {
		cyphertext: {},
		messages: {}
	};

	/** @ignore */
	private processedMessages: Set<number>	= new Set<number>();

	/** Number of messages that haven't appeared in viewport. */
	public unreadMessages: number	= 0;

	/** @ignore */
	private appeared ($elem: JQuery) : boolean {
		const offset	= $elem.offset();
		return offset.top > 0 && offset.top < this.elements.messageList().height();
	}

	/** Process read-ness and scrolling */
	private async mutationObserverHandler (elem: Node) : Promise<void> {
		const $elem: JQuery	= $(elem);
		const messageIndex	= parseInt($elem.attr('message-index'), 10);

		if (isNaN(messageIndex) || this.processedMessages.has(messageIndex)) {
			return;
		}
		this.processedMessages.add(messageIndex);

		const message		= this.chat.messages[messageIndex];

		if (!message || !message.unread) {
			return;
		}

		nanoScroller.update();

		if (!visibilityWatcher.isVisible) {
			this.updateMessageCount();
			await visibilityWatcher.waitForChange();
		}

		const $messageList		= this.elements.messageList();
		const scrollPosition	=
			$messageList[0].scrollHeight -
			(
				$messageList[0].scrollTop +
				$messageList[0].clientHeight
			)
		;

		if (($elem.height() + 150) > scrollPosition) {
			this.scrollDown();
			return;
		}

		this.updateMessageCount();
		while (!this.appeared($elem)) {
			await util.sleep();
		}

		message.unread	= false;
		this.updateMessageCount();
	}

	/** @ignore */
	private updateMessageCount () : void {
		util.lock(this.messageCountLock, async () => {
			this.unreadMessages	= this.chat.messages.filter(o => o.unread).length;

			if (this.messageCountInTitle) {
				this.elements.title().text(
					(this.unreadMessages > 0 ? `(${this.unreadMessages}) ` : '') +
					this.elements.title().text().replace(/^\(\d+\) /, '')
				);
			}

			await util.sleep();
		});
	}

	/**
	 * Scrolls to bottom of message list.
	 * @param shouldScrollCyphertext If true, scrolls cyphertext UI
	 * instead of main message list
	 */
	public async scrollDown (shouldScrollCyphertext?: boolean) : Promise<void> {
		return util.lockTryOnce(
			shouldScrollCyphertext ?
				this.scrollDownLocks.cyphertext :
				this.scrollDownLocks.messages
			,
			async () => {
				await util.sleep();

				const $elem	= await CyphElements.waitForElement(
					shouldScrollCyphertext ?
						this.elements.cyphertext :
						this.elements.messageList
				);

				await $elem.animate({scrollTop: $elem[0].scrollHeight}, 350).promise();

				if (shouldScrollCyphertext) {
					return;
				}

				for (const message of this.chat.messages) {
					if (message.unread) {
						message.unread	= false;
					}
				}

				this.updateMessageCount();
			}
		);
	}

	constructor (
		/** @ignore */
		private readonly chat: Chat,

		/** @ignore */
		private readonly elements: IElements,

		/** @ignore */
		private readonly messageCountInTitle?: boolean
	) { (async () => {
		await CyphElements.waitForElement(this.elements.messageListInner);

		new MutationObserver(mutations => {
			for (const mutation of mutations) {
				for (const elem of Array.from(mutation.addedNodes)) {
					this.mutationObserverHandler(elem);
				}
			}
		}).observe(this.elements.messageListInner()[0], {
			attributes: false,
			characterData: false,
			childList: true,
			subtree: true
		});

		nanoScroller.update();

		/* Workaround for jQuery appear plugin */
		this.elements.messageList().scroll(() => cyphElements.window().trigger('scroll'));
	})(); }
}
