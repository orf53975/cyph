import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {
	ActivatedRouteSnapshot,
	CanActivate,
	Router,
	RouterStateSnapshot
} from '@angular/router';
import * as $ from 'jquery';
import {first} from 'rxjs/operators/first';
import {config} from '../cyph/config';
import {AccountService} from '../cyph/services/account.service';
import {AccountAuthService} from '../cyph/services/crypto/account-auth.service';
import {PotassiumService} from '../cyph/services/crypto/potassium.service';
import {EnvService} from '../cyph/services/env.service';
import {FaviconService} from '../cyph/services/favicon.service';
import {translate} from '../cyph/util/translate';
import {sleep, waitForValue} from '../cyph/util/wait';
import {ChatRootStates} from './enums';


/**
 * Angular service for Cyph web UI.
 */
@Injectable()
export class AppService implements CanActivate {
	/** @ignore */
	private readonly lockedDownRoute: Promise<string>	= new Promise<string>(resolve => {
		this.resolveLockedDownRoute	= resolve;
	});

	/** @ignore */
	private resolveLockedDownRoute: (lockedDownRoute: string) => void	= () => {};

	/** @see ChatRootStates */
	public chatRootState: ChatRootStates	= ChatRootStates.blank;

	/** If true, app is locked down. */
	public isLockedDown: boolean			=
		!!this.envService.environment.customBuild &&
		!!this.envService.environment.customBuild.config.password &&
		!locationData.hash.match(
			new RegExp(`[${config.readableIDCharacters.join('|')}]{${config.secretLength}}$`)
		)
	;

	/** @ignore */
	private async loadComplete () : Promise<void> {
		$(document.body).addClass('load-complete');
		await sleep(5000);
		$('#pre-load').remove();
	}

	/** @inheritDoc */
	public canActivate (_: ActivatedRouteSnapshot, state: RouterStateSnapshot) : boolean {
		if (this.isLockedDown) {
			this.resolveLockedDownRoute(state.url);
			return false;
		}
		else {
			return true;
		}
	}

	/** Disables lockdown. */
	public async unlock () : Promise<void> {
		if (!this.isLockedDown) {
			return;
		}

		this.isLockedDown	= false;
		this.router.navigateByUrl(await this.lockedDownRoute);
	}

	constructor (
		accountAuthService: AccountAuthService,

		faviconService: FaviconService,

		potassiumService: PotassiumService,

		titleService: Title,

		/** @ignore */
		private readonly router: Router,

		/** @ignore */
		private readonly accountService: AccountService,

		/** @ignore */
		private readonly envService: EnvService
	) {
		try {
			(<any> navigator).storage.persist();
		}
		catch {}

		titleService.setTitle(translate(titleService.getTitle()));
		
		if (this.envService.isTelehealth) {
			faviconService.setFavicon('telehealth');
		}

		self.onhashchange	= () => {
			if (!locationData.hash.match(/^#?\/?account(\/|$)/)) {
				location.reload();
			}
		};

		(async () => {
			/* Redirect clients that cannot support native crypto when required */
			if (
				(await potassiumService.native()) &&
				!(await potassiumService.isNativeCryptoSupported())
			) {
				location.pathname	= '/unsupportedbrowser';
				return;
			}

			if (this.isLockedDown) {
				this.loadComplete();
			}

			await (
				await waitForValue(() =>
					router.routerState.root.firstChild || undefined
				)
			).url.pipe(first()).toPromise();

			const urlSegmentPaths	= router.url.split('/');

			if (this.envService.isExtension) {
				router.navigate([accountRoot, 'contacts']);
			}

			if (accountRoot === '' || urlSegmentPaths[0] === accountRoot) {
				await this.accountService.uiReady;
			}
			else {
				while (this.chatRootState === ChatRootStates.blank) {
					await sleep();
				}

				await sleep();
			}

			this.loadComplete();
		})();
	}
}
