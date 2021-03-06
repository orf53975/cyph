import {Component, OnInit} from '@angular/core';
import {StringProto} from '../../../cyph/proto';
import {EnvService} from '../../../cyph/services/env.service';
import {LocalStorageService} from '../../../cyph/services/local-storage.service';
import {StringsService} from '../../../cyph/services/strings.service';
import {random} from '../../../cyph/util/random';
import {sleep} from '../../../cyph/util/wait';
import {AppService} from '../../app.service';


/**
 * Angular component for the Cyph lockdown screen.
 */
@Component({
	selector: 'cyph-lockdown',
	styleUrls: ['./lockdown.component.scss'],
	templateUrl: './lockdown.component.html'
})
export class LockdownComponent implements OnInit {
	/** @ignore */
	private correctPassword?: string;

	/** Indicates whether unlock attempt is in progress. */
	public checking: boolean	= false;

	/** Indicates whether the last unlock attempt has failed. */
	public error: boolean		= false;

	/** Password to be used for unlock attempt. */
	public password: string		= '';

	/** Indicates whether component has been initiated. */
	public ready: boolean		= false;

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		if (!(
			this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.password
		)) {
			this.appService.isLockedDown	= false;
			return;
		}

		this.correctPassword	= this.envService.environment.customBuild.config.password;

		const password	=
			await this.localStorageService.getItem('password', StringProto).catch(() => '')
		;

		/* tslint:disable-next-line:possible-timing-attack */
		if (password === this.correctPassword) {
			this.appService.unlock();
		}

		this.ready	= true;
	}

	/** Initiates unlock attempt. */
	public async submit () : Promise<void> {
		this.checking	= true;
		this.error		= false;

		await sleep(random(1000, 250));

		/* tslint:disable-next-line:possible-timing-attack */
		if (this.password === this.correctPassword) {
			this.appService.unlock();
			await this.localStorageService.setItem('password', StringProto, this.password);
			return;
		}

		this.checking	= false;
		this.error		= true;
	}

	constructor (
		/** @ignore */
		private readonly appService: AppService,

		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}
