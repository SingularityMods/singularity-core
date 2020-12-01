import './HomePage.css';
import SimpleBar from 'simplebar-react';

import { Row, Col } from 'react-bootstrap';
import * as React from 'react';
const { ipcRenderer } = require('electron');

import SocialLinkBar from '../SocialLinkBar';

export default class HomePage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            darkMode: false,
            appVersion: ''
        }
        this.darkModeToggleListener = this.darkModeToggleListener.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('darkmode-toggle', this.darkModeToggleListener);
        const appSettings = ipcRenderer.sendSync('get-app-settings');
        var appVersion = ipcRenderer.sendSync('get-app-version');
        let darkMode = appSettings.darkMode;
        this.setState({
            darkMode: darkMode,
            appVersion: appVersion
        });   
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('darkmode-toggle', this.darkModeToggleListener);
    }

    darkModeToggleListener(event, darkMode) {
        this.setState({
            darkMode:darkMode
        })
    }


    render() {
        return (
            <div className="HomePage">                
                <Row>
                    <Col className="homepage-title">
                            <img src={this.state.darkMode ? '../img/logo_white.png' : '../img/logo.png' }  className="app-logo-banner" />
                    </Col>
                    </Row>
                    
                    <Row>
                    
                    <Col xs={12} className="homepage-content">
                        <SocialLinkBar />
                        <div className="app-version-display">v {this.state.appVersion}</div>
                        <SimpleBar scrollbarMaxSize={50} className={process.platform === 'darwin' ? "home-page-bar mac" : "home-page-bar" } >
                            <div >
                                <h3 className="release-notes-title">Release Notes</h3>
                                <h5>1.1.0 <span className="release-note-date">2020-12-1</span></h5>
                                <h5 className="release-note-section-header">New Features:</h5>
                                <p className="release-note-bullet"> - You can now sync installed addons between multiple computers. After enabling the sync profile, Singularity will sync from the profile every 5 minutes. *</p>
                                <p className="release-note-bullet"> - You can now configure Singularity to instead minimize to the system tray on close under the settings menu.</p>
                                <p className="release-note-bullet"> - After detecting installed game versions if Singularity does not detect any installed addons, you can now choose to restore a backup if one exists.</p>
                                <p className="release-note-bullet"> - You can now configure the default release channel (alpha, beta, release) for newly installed addons under the settings menu.</p>
                                <p className="release-note-bullet"> - You can now configure whether Singularity automatically updates newly installed addons under the settings menu.</p>
                                <p className="release-note-bullet"> - You can now browse directly to an addons website from the addon details window.</p>
                                <p className="release-note-bullet"> - You can now open the directory containing Singularity's debug logs from a link in the settings menu.</p>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - The addon category dropdown is now sorted alphabetically.</p>
                                <br />
                                <p>* Requires a Singularity account.</p>
                                <br />
                                <h5>1.0.4 <span className="release-note-date">2020-11-27</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that caused Singularity to throw an error when attempting to identify installed addons after identifying game location.</p>
                                <hr />
                                <h5>1.0.3 <span className="release-note-date">2020-11-21</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that caused Singularity to throw an error when attempting to identify a game installation automatically.</p>
                                <hr />
                                <h5>1.0.2 <span className="release-note-date">2020-11-20</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Updated dependency in singularity-core.</p>
                                <hr />
                                <h5>1.0.1 <span className="release-note-date">2020-11-20</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that caused Singularity to throw an error when attempting to identify a game installation manually.</p>
                                <hr />
                                <h5>1.0.0 <span className="release-note-date">2020-11-20</span></h5>
                                <p>Singularity is now open source! Check out the repository <a className="release-notes-link" target="_blank" rel="noreferrer" href="https://github.com/SingularityMods/singularity-core">on GitHub</a> to contribute and submit issues.</p>
                                <h5 className="release-note-section-header">New Features:</h5>
                                <p className="release-note-bullet"> - You can now create an account on SingularityMods.com or in-app to access additional features.</p>
                                <p className="release-note-bullet"> - Singularity now supports cloud backups. When creating a backup, you can choose to upload a copy of it to Singularity&apos;s servers. Storage is cheap but not free so only the latest cloud backup per game verison will be retained. *</p>
                                <p className="release-note-bullet"> - You can now choose to restore specific addons from a backup. Because of these changes, backups made prior to v1.0.0 are no-longer compatible and will be deleted in an upcoming release.</p>
                                <p className="release-note-bullet"> - You can now minimize the game-select sidebar.</p>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that prevented users from changing their local backup directory. Actually, this release went ahead and removed that directory entirely.</p>
                                <p className="release-note-bullet"> - Fixed an issue that cause Singularity to throw ugly errors if left running while the computer sleeps.</p>
                                <br />
                                <p>* Requires a Singularity account.</p>
                                <hr />
                                <h5>0.6.0 <span className="release-note-date">2020-10-27</span></h5>
                                <h5 className="release-note-section-header">New Features:</h5>
                                <p className="release-note-bullet"> - You can now filter installed addons by addon name.</p>
                                <p className="release-note-bullet"> - You can now delete individual addons from the addon details view.</p>
                                <p className="release-note-bullet"> - You can now configure the default version of WoW that Singularity shows from within the app settings menu.</p>
                                <p className="release-note-bullet"> - You can now re-configure the installation directories for each WoW version from within the app settings menu.</p>
                                <p className="release-note-bullet"> - You can now sort all columns of the installed addons table.</p>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed several issues that were causing unexpected behavior when sorting installed addons by name or installation status.</p>
                                <hr />
                                <h5>0.5.2 <span className="release-note-date">2020-10-23</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Singularity now correctly identifies the retail beta client on macOS.</p>
                                <p className="release-note-bullet"> - Resolved an issue that caused installing specific addon versions to fail.</p>
                                <hr />
                                <h5>0.5.1 <span className="release-note-date">2020-10-14</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that caused Singularity to die a painful death after upgrading from 0.4.2 in some cases.</p>
                                <hr />
                                <h5>0.5.0 <span className="release-note-date">2020-10-13</span></h5>
                                <h5 className="release-note-section-header">New Features:</h5>
                                <p className="release-note-bullet"> - Added a right-click menu to configure additional settings for installed addons.</p>
                                <p className="release-note-bullet"> - You can now choose to follow alpha and beta branches for addon updates.</p>
                                <p className="release-note-bullet"> - You can now choose to have Singularity automatically install addon updates per-addon.</p>
                                <p className="release-note-bullet"> - You can now choose to have Singularity ignore an addon.</p>
                                <p className="release-note-bullet"> - Addon files now show where they were first sourced from.</p>
                                <hr />
                                <h5>0.4.2 <span className="release-note-date">2020-10-06</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that could prevent users from changing their backup directory.</p>
                                <p className="release-note-bullet"> - Fixed an issue that could cause some addons to show multiple installed versions.</p>
                                <hr />
                                <h5>0.4.1 <span className="release-note-date">2020-10-02</span></h5>
                                <p>Singularity now supports macOS! Check <a className="release-notes-link" target="_blank" rel="noreferrer" href="https://singularitymods.com">SingularityMods.com</a> for a download link.</p>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that caused Singularity to not properly search for and identify after locating an installation.</p>
                                <p className="release-note-bullet"> - Fixed an issue that caused the app to display an error when checking for app updates while no network is available.</p>
                                <hr />
                                <h5>0.4.0 <span className="release-note-date">2020-10-01</span></h5>
                                <h5 className="release-note-section-header">New Features:</h5>
                                <p className="release-note-bullet"> - You can now browse an addon&apos;s details directly from the currently-installed addons table.</p>
                                <p className="release-note-bullet"> - Addon screenshots that have been uploaded to CurseForge are now viewable in the new &lsquo;Screenshots&rsquo; tab within the addon details window.</p>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that caused the &lsquo;Update All&rsquo; option to go completely insane when processing a large number of addon updates.</p>
                                <p className="release-note-bullet"> - Links in an addon&apos;s description now correctly open in the OS&apos;s web browser instead of in-app.</p>
                                <p className="release-note-bullet"> - Fixed an issue that could cause Singularity to crash if left open after the initial install or update.</p>
                                <hr />
                                <h5>0.3.2 <span className="release-note-date">2020-09-30</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue where Singularity would not recognize the retail beta client directory.</p>
                                <hr />
                                <h5>0.3.1 <span className="release-note-date">2020-09-29</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed an issue that caused Singularity to assign an incorrect install path when a specific game version&apos;s directory
                                 is selected while searching for WoW installations. Users can fix broken configurations by re-selecting &ldquo;Find More&rdquo; and pointing Singularity
                                    to either the root WoW installation directory or a game version directory (ie. /_retail_)</p>
                                <hr />
                                <h5>0.3.0 <span className="release-note-date">2020-09-29</span></h5>
                                <p>Thanks to the efforts of @Rfkgaming, we now have a Discord server! Grab an invite link in the app from the discord icon on the home page
                                    or <a className="release-notes-link" target="_blank" rel="noreferrer" href="https://discord.gg/xNcqjUD">HERE</a>. Also, check out our subreddit on r/singularitymods.</p>
                                <h5 className="release-note-section-header">New Features:</h5>
                                <p className="release-note-bullet"> - You can now choose the backup storage location for addon settings and file backups in the settings menu.</p>
                                <p className="release-note-bullet"> - Backups are now stored with compression. As part of this change, all previous backups are now invalid.</p>
                                <hr />
                                <h5>0.2.2 <span className="release-note-date">2020-09-28</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - You can now locate additional versions of World of Warcraft by choosing the &ldquo;Find More&rdquo; link in the game version
                                    selection dropdown and navigating to the root World of Warcraft installation directory.</p>
                                <p className="release-note-bullet"> - Singularity can now continue to identify install addons after encountering an invalid addon directory.</p>
                                <hr />
                                <h5>0.2.1 <span className="release-note-date">2020-09-27</span></h5>
                                <h5 className="release-note-section-header">Bug Fixes:</h5>
                                <p className="release-note-bullet"> - Fixed a bug with settings restoration failing in certain situations.</p>
                                <hr />
                                <h5>0.2.0 <span className="release-note-date">2020-09-26</span></h5>
                                <h5 className="release-note-section-header">New Features:</h5>
                                <p className="release-note-bullet"> - Added a dark mode option for users who don&apos;t wish to be blinded by the light.</p>
                                <p className="release-note-bullet"> - Added a configuration option for how often the app checks for addon updates.</p>
                                <h5 className="release-note-section-header">Known Issues:</h5>
                                <h5 className="release-note-section-header">In development:</h5>
                                <p className="release-note-bullet"> - macOS support [ ~2 weeks ]</p>
                                <p className="release-note-bullet"> - Addon author accounts to upload and manage projects directly on singularitymods.com [ ~4 weeks ]</p>
                                <p className="release-note-bullet"> - User accounts for syncing addon installations accross multiple systems [ `&gt;`4 weeks ]</p>
                                <p className="release-note-bullet"> - Minecraft mod support [ `&gt;`4 weeks ]</p>
                                <hr />
                                <h5>0.1.2 <span className="release-note-date">2020-09-24</span></h5>
                                <p>Initial Beta Release! Thank you for being an early adopter for Singularity. This release contains all necessary functionality for managing
                                World of Warcraft addons in both the Retail and Classic clients, including PTR clients. Addons are currently sourced from Curse
                                    Forge and Tukui. If you originally installed your addons from either of those locations, the manager can find them.</p>
                                <h5 className="release-note-section-header">Known Issues:</h5>
                                <p className="release-note-bullet"> - Addons installed from Tukui prior to September 1st 2020 may not be detected during an installed addon refresh.</p>
                                <h5 className="release-note-section-header">In development:</h5>
                                <p className="release-note-bullet"> - Dark mode [ ~2 weeks ]</p>
                                <p className="release-note-bullet"> - macOS support [ ~2 weeks ]</p>
                                <p className="release-note-bullet"> - Addon author accounts to upload and manage projects directly on singularitymods.com [ ~4 weeks ]</p>
                                <p className="release-note-bullet"> - User accounts for syncing addon installations accross multiple systems [ `&gt;`4 weeks ]</p>
                                <p className="release-note-bullet"> - Minecraft mod support [ `&gt;`4 weeks ]</p>
                            
                            </div>
                        </SimpleBar>
                        </Col>
                        

                    </Row>
                    <Row>
                        <Col xs={12} className="homepage-footer">
                            <div className="footer-link"><a target="_blank" rel="noreferrer" href="https://github.com/SingularityMods/singularity-core/issues">Support</a></div>
                        </Col>
                    </Row>
            </div>
        )
    }
}