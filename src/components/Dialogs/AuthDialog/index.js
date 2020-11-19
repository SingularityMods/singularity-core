import './AuthDialog.css';

import * as React from 'react';
import { Row, Col, Tabs, Tab, Button, Form, FormControl, FormGroup, Spinner } from 'react-bootstrap';

import { ipcRenderer } from 'electron';

export default class AuthDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dialogTab: this.props.authTab,
            darkMode: true,
            loginEmail: '',
            loginPassword: '',
            username: '',
            password: '',
            confirmPassword: '',
            email: '',
            touched: {
                username: false,
                password: false,
                confirmPassword: false,
                email: false
            },
            working: {
                username: false,
                password: false,
                confirmPassword: false,
                email: false
            },
            timeout: {
                username: 0,
                password: 0,
                confirmPassword: 0,
                email: 0
            },
            errors: {
                loginEmail: null,
                loginPassword: null,
                username: null,
                password: null,
                confirmPassword: null,
                email: null
            },
            error: '',
            formValid: false,
            loginPending: false,
            signupPending: false,
            signupSuccess: false,
            sendingEmail: false,
            emailResent: false
        }
        this.capslock = false;
        this.usernameCheckListener = this.usernameCheckListener.bind(this);
        this.authEventListener = this.authEventListener.bind(this);
        this.emailResentEventListener = this.emailResentEventListener.bind(this);
        this.checkIfFormIsValid = this.checkIfFormIsValid.bind(this);
        this.validateUsername = this.validateUsername.bind(this);
        this.validateEmail = this.validateEmail.bind(this);
        this.validatePassword = this.validatePassword.bind(this);
        this.validateConfPassword = this.validateConfPassword.bind(this);
        this.onTouchUsername = this.onTouchUsername.bind(this);
        this.onTouchPassword = this.onTouchPassword.bind(this);
        this.onTouchConfirmPassword = this.onTouchConfirmPassword.bind(this);
        this.onTouchEmail = this.onTouchEmail.bind(this);
        this.handleChangeLoginEmail = this.handleChangeLoginEmail.bind(this);
        this.handleChangeLoginPassword = this.handleChangeLoginPassword.bind(this);
        this.handleChangeUsername = this.handleChangeUsername.bind(this);
        this.handleChangePassword = this.handleChangePassword.bind(this);
        this.handleChangeConfirmPassword = this.handleChangeConfirmPassword.bind(this);
        this.handleChangeEmail = this.handleChangeEmail.bind(this);
        this.onSubmitLogin = this.onSubmitLogin.bind(this);
        this.onSubmitSignup = this.onSubmitSignup.bind(this);
        this.onSubmitResendEmail = this.onSubmitResendEmail.bind(this);
        this.checkForCapsLock = this.checkForCapsLock.bind(this);

    }
    componentDidMount() {
        ipcRenderer.on('auth-event', this.authEventListener);
        ipcRenderer.on('username-check', this.usernameCheckListener);
        ipcRenderer.on('email-resent', this.emailResentEventListener);
        document.addEventListener('keyup', this.checkForCapsLock);
        const darkMode = ipcRenderer.sendSync('is-dark-mode');
        this.setState({
            darkMode: darkMode
        })
    }

    componentWillUnmount() {
        ipcRenderer.removeListener('auth-event', this.authEventListener);
        ipcRenderer.removeListener('username-check', this.usernameCheckListener);
        ipcRenderer.removeListener('email-resent', this.emailResentEventListener);
        document.removeEventListener('keyup', this.checkForCapsLock);
    }

    componentDidUpdate(prevProps) {
        if (this.props.authTab != prevProps.authTab) {
            this.setState({
                dialogTab: this.props.authTab,
                loginEmail: '',
                loginPassword: '',
                username: '',
                password: '',
                confirmPassword: '',
                email: '',
                touched: {
                    username: false,
                    password: false,
                    confirmPassword: false,
                    email: false
                },
                working: {
                    username: false,
                    password: false,
                    confirmPassword: false,
                    email: false
                },
                timeout: {
                    username: 0,
                    password: 0,
                    confirmPassword: 0,
                    email: 0
                },
                errors: {
                    loginEmail: null,
                    loginPassword: null,
                    username: null,
                    password: null,
                    confirmPassword: null,
                    email: null
                },
                error: '',
                formValid: false
            })
        }
    }

    usernameCheckListener(event, username, available) {
        let working = this.state.working;
        working.username = false;
        let errors = this.state.errors;
        if (available) {
            errors.username = null;
        } else {
            errors.username = 'Username Unavailable';
        }
        let formValid = this.checkIfFormIsValid();
        this.setState({
            working: working,
            errors: errors,
            formValid: formValid
        })
    }

    authEventListener(event,type, success, message) {
        if (type == 'signup') {
            if (!success) {
                this.setState({
                    error: message,
                    signupPending: false
                });
            } else {
                this.setState({
                    signupSuccess: true,
                    signupPending: false
                })
            }
        } else if (type =='login') {
            if (!success) {
                this.setState({
                    error: message,
                    loginPending: false
                });
            } else {
                this.props.onClose();
            }
        }
    }

    emailResentEventListener(event, success) {
        this.setState({
            emailResent: true,
            sendingEmail: false
        })
    }

    checkForCapsLock(event) {
        this.capslock = event.getModifierState("CapsLock");
    }

    checkIfFormIsValid = () => {
        if ((!this.state.working.username && !this.state.errors.username && this.state.username.length > 0)
            && (!this.state.working.password && !this.state.errors.password && this.state.password.length > 0)
            && (!this.state.working.password && !this.state.errors.password && this.state.password.length > 0)
            && (!this.state.working.email && !this.state.errors.email && this.state.email.length > 0)) {
            return true;
        } else {
            return false;
        }

    }

    validateUsername = () => {
        if (this.state.username.length >= 3) {
            ipcRenderer.send('check-username', this.state.username);
        } else {
            let working = this.state.working;
            working.username = false;
            let errors = this.state.errors;
            errors.username = 'Username must be at least 3 characters'
            this.setState({
                working: working,
                errors: errors,
                formValid: false
            })
        }

    }
    
    validateEmail = () => {
        if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(this.state.email)) {
            let working = this.state.working;
            working.email = false;
            let errors = this.state.errors;
            errors.email = null;
            let formValid = this.checkIfFormIsValid();
            this.setState({
                working: working,
                errors: errors,
                formValid: formValid
            })
        } else {
            let working = this.state.working;
            working.email = false;
            let errors = this.state.errors;
            errors.email = 'Enter a valid email address'
            this.setState({
                working: working,
                errors: errors,
                formValid: false
            })
        }
    }
    
    validatePassword = () => {
        if (this.state.password.length >= 11) {
            let working = this.state.working;
            working.password = false;
            let errors = this.state.errors;
            errors.password = null;
            let formValid = this.checkIfFormIsValid();
            this.setState({
                working: working,
                errors: errors,
                formValid: formValid
            })
        } else {
            let working = this.state.working;
            working.password = false;
            let errors = this.state.errors;
            errors.password = 'Password must be at least 11 characters'
            this.setState({
                working: working,
                errors: errors,
                formValid: false
            })
        }
    }
    
    validateConfPassword = () => {
        if (this.state.confirmPassword === this.state.password) {
            let working = this.state.working;
            working.confirmPassword = false;
            let errors = this.state.errors;
            errors.confirmPassword = null;
            let formValid = this.checkIfFormIsValid();
            this.setState({
                working: working,
                errors: errors,
                formValid: formValid
            })
        } else {
            let working = this.state.working;
            working.confirmPassword = false;
            let errors = this.state.errors;
            errors.confirmPassword = 'Passwords must match'
            this.setState({
                working: working,
                errors: errors,
                formValid: false
            })
        }
    }

    handleChangeLoginEmail = (e) => {
        this.setState({
            loginEmail: e.target.value
        });
    }

    handleChangeLoginPassword = (e) => {
        this.setState({
            loginPassword: e.target.value
        });
    }

    handleChangeUsername = (e) => {
        const self = this;
        let working = this.state.working;
        working.username = true;
        let timeout = this.state.timeout;
        if (timeout.username) {
            clearTimeout(this.state.timeout.username);
        }
        timeout.username = setTimeout(() => {
            self.validateUsername();
        },700)
        this.setState({ 
            username: e.target.value,
            working: working,
            timeout: timeout
        });
    }

    handleChangePassword = (e) => {
        const self = this;
        let working = this.state.working;
        working.password = true;
        let timeout = this.state.timeout;
        let errors = this.state.errors;
        if (this.capslock) {
            errors.password = "Caps Lock is on!"
        } else {
            errors.password = ""
        }
        if (timeout.password) {
            clearTimeout(this.state.timeout.password)
        }
        timeout.password = setTimeout(() => {
            self.validatePassword();
        },700)
        this.setState({ 
            password: e.target.value,
            working: working,
            timeout: timeout,
            errors: errors
        });
    }

    handleChangeConfirmPassword = (e) => {
        const self = this;
        let working = this.state.working;
        working.confirmPassword = true;
        let timeout = this.state.timeout;
        if (timeout.confirmPassword) {
            clearTimeout(this.state.timeout.confirmPassword)
        }
        timeout.confirmPassword = setTimeout(() => {
            self.validateConfPassword();
        },700)
        this.setState({
            confirmPassword: e.target.value,
            working: working,
            timeout: timeout
        });
    }

    handleChangeEmail = (e) => {
        const self = this;
        let working = this.state.working;
        working.email = true;
        let timeout = this.state.timeout;
        if (timeout.email) {
            clearTimeout(this.state.timeout.email)
        }
        timeout.email = setTimeout(() => {
            self.validateEmail();
        },700)
        this.setState({
            email: e.target.value,
            working: working,
            timeout: timeout
        });
    }

    onTouchUsername = (e) => {
        e.preventDefault();
        let touched = this.state.touched;
        touched.username = true;
        this.setState({
            touched: touched
        })
    }

    onTouchPassword = (e) => {
        e.preventDefault();
        let touched = this.state.touched;
        touched.password = true;
        this.setState({
            touched: touched
        })
    }

    onTouchConfirmPassword = (e) => {
        e.preventDefault();
        let touched = this.state.touched;
        touched.confirmPassword = true;
        this.setState({
            touched: touched
        })
    }

    onTouchEmail = (e) => {
        e.preventDefault();
        let touched = this.state.touched;
        touched.email = true;
        this.setState({
            touched: touched
        })
    }

    onSubmitLogin = (e) => {
        this.setState({
            error: '',
            loginPending: true
        });
        e.preventDefault();
        ipcRenderer.send('login-auth', this.state.loginEmail, this.state.loginPassword);
      }

    onSubmitSignup = (e) => {
        this.setState({
            error: '',
            signupPending: true
        });
        e.preventDefault();
        ipcRenderer.send('signup-auth', this.state.username, this.state.email, this.state.password);
      }

    onSubmitResendEmail = (e) => {
        e.preventDefault();
        this.setState({
            emailResent: false,
            sendingEmail: true
        });
        e.preventDefault();
        ipcRenderer.send('resend-email-auth');
    }

    render() {
        return (
            <div className="AuthDialog">
                {this.state.signupSuccess
                    ? <div className={process.platform == 'win32' ? "auth-dialog-content verify windows" : "auth-dialog-content verify"}>
                            <Row className="auth-dialog-exit">
                                <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                                    <button className="menubar-btn auth-dialog-btn" id="close-btn" onClick={this.props.onClose}><i className="fas fa-times"></i></button>
                                </Col>
                            </Row>
                            <Row className={'auth-dialog-title verify'}>
                                <Col xs={12}>
                                <img key={this.props.darkMode} src={this.props.darkMode ? '../img/app_icon_white.png' : '../img/app_icon.png'} className="app-icon" />
                                    <h2>Check Your Email</h2>
                                </Col>
                            </Row>
                            <Row>
                                <Col xs={12} className="auth-form-terms-message">
                                <p>You're almost there!</p>
                                        <p>We sent an email to {this.state.email}. Before you can use your account you'll need to verify the email address that you provided.</p>
                                        <p>Be sure to check your spam box. If you haven't seen it in the next 5 minutes, hit the link below or log in to SingularityMods.com to request another.</p>
                                        <p><a href="#" className="signup-link" onClick={this.onSubmitResendEmail}>Re-Send Email</a></p>
                                </Col>
                            </Row>
                            <Row >
                                <Col xs={12} className="auth-dialog-submit">
                                    {this.state.sendingEmail
                                            ? <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="resend-email-spinner"  id="resend-email-spinner">
                                                <span className="sr-only">Loading...</span>
                                                </Spinner>
                                            : ''}
                                    {this.state.emailResent
                                        ?  <div className="email-resent-icon-container">
                                            <i className="fas fa-check-circle email-resent-icon"></i>
                                        </div>
                                        : ''
                                    }
                                    <Button
                                        className="auth-dialog-button"
                                        onClick={this.props.onClose}>Sounds Good</Button>
                                </Col>
                            </Row>
                    </div>
                    : <div className={
                        process.platform == 'win32'
                            ? this.state.dialogTab == 'signup'
                                ? "auth-dialog-content windows"
                                : 'auth-dialog-content windows login'
                            : this.state.dialogTab == 'signup'
                                ? "auth-dialog-content"
                                : "auth-dialog-content login"}>
                            <Row className="auth-dialog-exit">
                                <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                                    <button className="menubar-btn auth-dialog-btn" id="close-btn" onClick={this.props.onClose}><i className="fas fa-times"></i></button>
                                </Col>
                            </Row>
                            <Row className={this.state.dialogTab == 'signup' ? "auth-dialog-title" : 'auth-dialog-title login'}>
                                <Col xs={12}>
                                <img key={this.props.darkMode} src={this.props.darkMode ? '../img/app_icon_white.png' : '../img/app_icon.png'} className="app-icon" />
                                {this.state.dialogTab == 'signup'
                                    ? <h2>Sign up</h2>
                                    : <h2>Log in</h2>
                                }
                                </Col>
                            </Row>
                            <Row className="auth-dialog-select">
                                <Col xs={6}>
                                <Tabs
                                    id="game-window-menu-tabs"
                                    activeKey={this.state.dialogTab}
                                    onSelect={this.props.toggleTab}
                                >
                                    <Tab eventKey="login" title="Login">
                                    </Tab>
                                    <Tab eventKey="signup" title="Sign Up">
                                    </Tab>
                                </Tabs>
                                </Col>
                            </Row>
                            <Row>
                                {this.state.dialogTab == 'signup'
                                    ? <Col xs={12} className="auth-dialog-form signup">
                                        <Form>
                                            <FormGroup>
                                                <FormControl
                                                    id="signupUsername"
                                                    name="username"
                                                    type="text"
                                                    placeholder="Username"
                                                    autoComplete="off"
                                                    value={this.state.username}
                                                    isValid={!this.state.working.username && !this.state.errors.username && this.state.username.length > 0}
                                                    isInvalid={!this.state.working.username && this.state.errors.username && this.state.username.length > 0}
                                                    onClick={this.onTouchUsername}
                                                    onChange={this.handleChangeUsername}
                                                    onKeyPress={event => {
                                                        if (event.key === "Enter") {
                                                            this.onSubmit(event);
                                                        }
                                                        }}>
                                                </FormControl>
                                                {this.state.working.username
                                                    ? <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner" id="username-validation-spinner">
                                                        <span className="sr-only">Loading...</span>
                                                        </Spinner>
                                                    : ''}
                                                <Form.Text className="auth-form-error-text" id="signupUsername" muted>
                                                    {this.state.errors.username}
                                                </Form.Text>
                                                <FormControl
                                                    id="signupPassword"
                                                    name="password"
                                                    type="password"
                                                    placeholder="Password"
                                                    autoComplete="off"
                                                    value={this.state.password}
                                                    isValid={!this.state.working.password && !this.state.errors.password && this.state.password.length > 0}
                                                    isInvalid={!this.state.working.password && this.state.errors.password && this.state.password.length > 0}
                                                    onClick={this.onTouchPassword}
                                                    onChange={this.handleChangePassword}
                                                    onKeyPress={event => {
                                                        if (event.key === "Enter") {
                                                            this.onSubmit(event);
                                                        }
                                                        }}>
                                                </FormControl>
                                                {this.state.working.password
                                                    ? <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner password"  id="password-validation-spinner">
                                                        <span className="sr-only">Loading...</span>
                                                        </Spinner>
                                                    : ''}
                                                <Form.Text className="auth-form-error-text" id="signupPassword" muted>
                                                    {this.state.errors.password}
                                                </Form.Text>
                                                <FormControl
                                                    id="signupConfirmPassword"
                                                    name="confirmPassword"
                                                    type="password"
                                                    placeholder="Confirm Password"
                                                    autoComplete="off"
                                                    value={this.state.confirmPassword}
                                                    isValid={!this.state.working.confirmPassword && !this.state.errors.confirmPassword && this.state.confirmPassword.length > 0}
                                                    isInvalid={!this.state.working.confirmPassword && this.state.errors.confirmPassword && this.state.confirmPassword.length > 0}
                                                    onClick={this.onTouchConfirmPassword}
                                                    onChange={this.handleChangeConfirmPassword}
                                                    onKeyPress={event => {
                                                        if (event.key === "Enter") {
                                                            this.onSubmit(event);
                                                        }
                                                        }}>
                                                </FormControl>
                                                {this.state.working.confirmPassword
                                                    ? <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner confirmpassword"  id="confirmpassword-validation-spinner">
                                                        <span className="sr-only">Loading...</span>
                                                        </Spinner>
                                                    : ''}
                                                <Form.Text className="auth-form-error-text" id="signupConfirmPassword" muted>
                                                    {this.state.errors.confirmPassword}
                                                </Form.Text>
                                                <FormControl
                                                    id="signupEmail"
                                                    name="email"
                                                    type="email"
                                                    placeholder="Email"
                                                    value={this.state.email}
                                                    isValid={!this.state.working.email && !this.state.errors.email && this.state.email.length > 0}
                                                    isInvalid={!this.state.working.email && this.state.errors.email && this.state.email.length > 0}
                                                    onClick={this.onTouchEmail}
                                                    onChange={this.handleChangeEmail}
                                                    onKeyPress={event => {
                                                        if (event.key === "Enter") {
                                                            this.onSubmit(event);
                                                        }
                                                        }}>
                                                </FormControl>
                                                {this.state.working.email
                                                    ? <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner email"  id="email-validation-spinner">
                                                        <span className="sr-only">Loading...</span>
                                                        </Spinner>
                                                    : ''}
                                                <Form.Text className="auth-form-error-text" id="signupEmail" muted>
                                                    {this.state.errors.email}
                                                </Form.Text>
                                            </FormGroup>
                                        </Form>
                                    </Col>
                                    : <Col xs={12} className="auth-dialog-form login">
                                        <Form>
                                            <FormGroup>
                                            <FormControl
                                                    id="loginEmail"
                                                    name="email"
                                                    type="email"
                                                    placeholder="Email"
                                                    value={this.state.loginEmail}
                                                    onChange={this.handleChangeLoginEmail}
                                                    onKeyPress={event => {
                                                        if (event.key === "Enter") {
                                                            this.onSubmitLogin(event);
                                                        }
                                                        }}>
                                                </FormControl>
                                                <Form.Text className="auth-form-error-text" id="loginEmail" muted>
                                                    {this.state.errors.email}
                                                </Form.Text>
                                                <FormControl
                                                    id="loginPassword"
                                                    name="password"
                                                    type="password"
                                                    placeholder="Password"
                                                    autoComplete="off"
                                                    value={this.state.loginPassword}
                                                    onChange={this.handleChangeLoginPassword}
                                                    onKeyPress={event => {
                                                        if (event.key === "Enter") {
                                                            this.onSubmitLogin(event);
                                                        }
                                                        }}>
                                                </FormControl>
                                                <Form.Text className="auth-form-error-text" id="loginPassword" muted>
                                                    {this.state.errors.loginPassword}
                                                </Form.Text>
                                            </FormGroup>
                                        </Form>
                                    </Col>
                                }
                                
                            </Row>
                            {this.state.dialogTab == 'signup'
                                ? <Row>
                                <Col xs={12} className="auth-form-terms-message">
                                    <p>By clicking Sign Up, you are indicating that you have read and acknowledged the <a className="signup-link" href="https://singularitymods.com/Terms" target="_blank">Terms of Service</a> and <a className="signup-link" href="https://singularitymods.com/Privacy" target="_blank">Privacy Notice</a>.</p>
                                </Col>
                            </Row>
                                : ''
                            }
                            <Row>
                                <Col xs={12} className="auth-form-error">
                                    {this.state.loginPending || this.state.signupPending
                                        ? <Spinner animation="border" size="sm" variant={this.state.darkMode ? 'light': 'dark'} role="status" className="auth-pending-spinner"  id="auth-pending-spinner">
                                        <span className="sr-only">Loading...</span>
                                        </Spinner>
                                        : ''}
                                    {this.state.error}
                                </Col>
                            </Row>
                            <Row >
                                {this.state.dialogTab == 'signup'
                                    ? <Col xs={12} className="auth-dialog-submit">
                                            <Button
                                                disabled={!this.state.formValid}
                                                className="auth-dialog-button"
                                                onClick={this.onSubmitSignup}>Sign Up</Button>
                                        </Col>
                                    : <Col xs={12} className="auth-dialog-submit">
                                            <Button
                                                className="auth-dialog-button"
                                                onClick={this.onSubmitLogin}>Login</Button>
                                        </Col>
                                }
                            </Row>
                            {this.state.dialogTab == 'login'
                                ? <Row>
                                        <Col xs={12} className="auth-form-terms-message forgot-password">
                                            <p><a className="signup-link" href="https://singularitymods.com/ResetPassword" target="_blank">Forgot Your Password?</a></p>
                                        </Col>
                                    </Row>
                                :'' }
                        </div>

                    }
                
            </div>
        )
    }
}