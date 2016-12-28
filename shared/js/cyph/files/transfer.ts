import {users} from '../session/enums';
import {IMessageData} from '../session/imessagedata';
import {util} from '../util';


/**
 * Represents an active file transfer.
 */
export class Transfer implements IMessageData {
	constructor (
		/** File name. */
		public readonly name: string = '',

		/** MIME type. */
		public readonly fileType: string = '',

		/** Indicates whether file should be handled as an image. */
		public readonly image: boolean = false,

		/** If image is true, this will be used as a self-destruct timeout for the message. */
		public imageSelfDestructTimeout: number = 0,

		/** File size in bytes (e.g. 3293860). */
		public size: number = 0,

		/** Symmetric key used for encrypting file over the wire. */
		public key: Uint8Array = new Uint8Array(0),

		/** Indicates whether file is being sent from this Cyph instance. */
		public isOutgoing: boolean = true,

		/** File URL. */
		public url: string = '',

		/** Percentage completion of transfer. */
		public percentComplete: number = 0,

		/** Unique ID to represent this file transfer. */
		public readonly id: string = util.generateGuid(),

		/** If defined, indicates an acceptance or rejection of a file transfer. */
		public answer: boolean|undefined = undefined,

		/** @inheritDoc */
		public author: string = users.me,

		/** @inheritDoc */
		public timestamp: number = util.timestamp()
	) {}
}
