import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import {of} from 'rxjs/observable/of';
import {take} from 'rxjs/operators/take';
import {UserPresence, userPresenceSelectOptions} from '../../account/enums';
import {User} from '../../account/user';
import {AccountUserTypes} from '../../proto';
import {AccountContactsService} from '../../services/account-contacts.service';
import {AccountFilesService} from '../../services/account-files.service';
import {AccountUserLookupService} from '../../services/account-user-lookup.service';
import {AccountService} from '../../services/account.service';
import {AccountAuthService} from '../../services/crypto/account-auth.service';
import {AccountDatabaseService} from '../../services/crypto/account-database.service';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {trackBySelf} from '../../track-by/track-by-self';
import {trackByValue} from '../../track-by/track-by-value';


/**
 * Angular component for account profile UI.
 */
@Component({
	selector: 'cyph-account-profile',
	styleUrls: ['./account-profile.component.scss'],
	templateUrl: './account-profile.component.html'
})
export class AccountProfileComponent implements OnInit {
	/** @ignore */
	private editorFocus: boolean	= false;

	/** @see AccountUserTypes */
	public readonly accountUserTypes: typeof AccountUserTypes	= AccountUserTypes;

	/** Current draft of user profile description. */
	public descriptionDraft: string	= '';

	/** TODO: Doctor list. */
	public readonly doctorTmp: Promise<User|undefined>	=
		this.accountUserLookupService.getUser('who')
	;

	/** Profile edit mode. */
	public editMode: boolean		= false;

	/** @see AccountContactsService.watchIfContact */
	public isContact?: Observable<boolean>;

	/** Maximum length of profile description. */
	public readonly maxDescriptionLength: number	= 140;

	/** @see UserPresence */
	public readonly statuses: typeof userPresenceSelectOptions	= userPresenceSelectOptions;

	/** @see trackBySelf */
	public readonly trackBySelf: typeof trackBySelf		= trackBySelf;

	/** @see trackByValue */
	public readonly trackByValue: typeof trackByValue	= trackByValue;

	/** User profile. */
	public user?: User;

	/** User organization profile. */
	public userOrganiztion?: User;

	/** @see UserPresence */
	public readonly userPresence: typeof UserPresence	= UserPresence;

	/** @ignore */
	private async setUser (username?: string) : Promise<void> {
		if (
			!this.accountDatabaseService.currentUser.value &&
			await this.accountAuthService.hasSavedCredentials()
		) {
			this.router.navigate(username ?
				[accountRoot, 'login'].
					concat(accountRoot ? [accountRoot] : []).
					concat(['profile', username])
				:
				[accountRoot, 'login']
			);
			return;
		}

		try {
			if (username) {
				this.isContact	= this.accountContactsService.watchIfContact(username);
				this.user		= await this.accountUserLookupService.getUser(username);
			}
			else if (this.accountDatabaseService.currentUser.value) {
				if (this.envService.isTelehealth) {
					const userType	=
						await this.accountDatabaseService.currentUser.value.user.userType.pipe(
							take(1)
						).toPromise()
					;

					if (
						this.envService.environment.customBuild &&
						this.envService.environment.customBuild.config.organization &&
						(
							userType === AccountUserTypes.Standard ||
							userType === AccountUserTypes.TelehealthPatient
						)
					) {
						this.router.navigate([
							accountRoot,
							'profile',
							this.envService.environment.customBuild.config.organization
						]);
						return;
					}
				}

				this.isContact	= of(false);
				this.user		= this.accountDatabaseService.currentUser.value.user;
			}
		}
		catch {}

		if (this.user) {
			this.userOrganiztion	=
				await this.accountUserLookupService.getOrganization(this.user)
			;

			this.accountService.resolveUiReady();
		}
		else {
			this.userOrganiztion	= undefined;

			this.router.navigate([accountRoot, 'login']);
		}
	}

	/** Indicates whether this is the profile of the currently signed in user. */
	public get isCurrentUser () : boolean {
		return (
			this.accountDatabaseService.currentUser.value !== undefined &&
			this.user === this.accountDatabaseService.currentUser.value.user
		);
	}

	/** Indicates whether the profile editor is in focus. */
	public get isEditorFocused () : boolean {
		return this.editorFocus && this.editMode;
	}

	public set isEditorFocused (value: boolean) {
		this.editorFocus	= value;
	}

	/** @inheritDoc */
	public async ngOnInit () : Promise<void> {
		this.accountService.transitionEnd();

		this.activatedRoute.params.subscribe(o => { this.setUser(o.username); });
	}

	/** Publishes new user description. */
	public async saveUserDescription () : Promise<void> {
		if (!this.user || !this.isCurrentUser) {
			throw new Error("Cannot modify another user's description.");
		}

		const draft	= this.descriptionDraft.trim();

		if (draft) {
			const profile	= await this.user.accountUserProfile.getValue();

			if (profile.description !== draft) {
				this.accountService.interstitial	= true;
				profile.description					= draft;
				await this.user.accountUserProfile.setValue(profile);
			}
		}

		this.accountService.interstitial	= false;
		this.editMode						= false;
	}

	constructor (
		/** @ignore */
		private readonly activatedRoute: ActivatedRoute,

		/** @ignore */
		private readonly router: Router,

		/** @see AccountService */
		public readonly accountService: AccountService,

		/** @see AccountAuthService */
		public readonly accountAuthService: AccountAuthService,

		/** @see AccountContactsService */
		public readonly accountContactsService: AccountContactsService,

		/** @see AccountDatabaseService */
		public readonly accountDatabaseService: AccountDatabaseService,

		/** @see AccountFilesService */
		public readonly accountFilesService: AccountFilesService,

		/** @see AccountUserLookupService */
		public readonly accountUserLookupService: AccountUserLookupService,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {}
}