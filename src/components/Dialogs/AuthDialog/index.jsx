import './AuthDialog.css';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Tabs, Tab, Button, Form, FormControl, FormGroup, Spinner,
} from 'react-bootstrap';
import { ipcRenderer } from 'electron';

class AuthDialog extends React.Component {
  constructor(props) {
    super(props);
    const {
      authTab,
    } = this.props;
    this.state = {
      dialogTab: authTab,
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
        email: false,
      },
      working: {
        username: false,
        password: false,
        confirmPassword: false,
        email: false,
      },
      timeout: {
        username: 0,
        password: 0,
        confirmPassword: 0,
        email: 0,
      },
      errors: {
        loginEmail: null,
        loginPassword: null,
        username: null,
        password: null,
        confirmPassword: null,
        email: null,
      },
      error: '',
      formValid: false,
      loginPending: false,
      signupPending: false,
      signupSuccess: false,
      sendingEmail: false,
      emailResent: false,
    };
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
  }

  componentDidUpdate(prevProps) {
    const {
      authTab,
    } = this.props;
    if (authTab !== prevProps.authTab) {
      this.setState({
        dialogTab: authTab,
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
          email: false,
        },
        working: {
          username: false,
          password: false,
          confirmPassword: false,
          email: false,
        },
        timeout: {
          username: 0,
          password: 0,
          confirmPassword: 0,
          email: 0,
        },
        errors: {
          loginEmail: null,
          loginPassword: null,
          username: null,
          password: null,
          confirmPassword: null,
          email: null,
        },
        error: '',
        formValid: false,
      });
    }
  }

  componentWillUnmount() {
    ipcRenderer.removeListener('auth-event', this.authEventListener);
    ipcRenderer.removeListener('username-check', this.usernameCheckListener);
    ipcRenderer.removeListener('email-resent', this.emailResentEventListener);
    document.removeEventListener('keyup', this.checkForCapsLock);
  }

  handleChangeLoginEmail(e) {
    this.setState({
      loginEmail: e.target.value,
    });
  }

  handleChangeLoginPassword(e) {
    this.setState({
      loginPassword: e.target.value,
    });
  }

  handleChangeUsername(e) {
    const {
      timeout,
      working,
    } = this.state;
    const self = this;
    working.username = true;
    if (timeout.username) {
      clearTimeout(timeout.username);
    }
    timeout.username = setTimeout(() => {
      self.validateUsername();
    }, 700);
    this.setState({
      username: e.target.value,
      working,
      timeout,
    });
  }

  handleChangePassword(e) {
    const self = this;
    const { working } = this.state;
    working.password = true;
    const { timeout } = this.state;
    const { errors } = this.state;
    if (this.capslock) {
      errors.password = 'Caps Lock is on!';
    } else {
      errors.password = '';
    }
    if (timeout.password) {
      clearTimeout(timeout.password);
    }
    timeout.password = setTimeout(() => {
      self.validatePassword();
    }, 700);
    this.setState({
      password: e.target.value,
      working,
      timeout,
      errors,
    });
  }

  handleChangeConfirmPassword(e) {
    const self = this;
    const { working } = this.state;
    working.confirmPassword = true;
    const { timeout } = this.state;
    if (timeout.confirmPassword) {
      clearTimeout(timeout.confirmPassword);
    }
    timeout.confirmPassword = setTimeout(() => {
      self.validateConfPassword();
    }, 700);
    this.setState({
      confirmPassword: e.target.value,
      working,
      timeout,
    });
  }

  handleChangeEmail(e) {
    const self = this;
    const { working } = this.state;
    working.email = true;
    const { timeout } = this.state;
    if (timeout.email) {
      clearTimeout(timeout.email);
    }
    timeout.email = setTimeout(() => {
      self.validateEmail();
    }, 700);
    this.setState({
      email: e.target.value,
      working,
      timeout,
    });
  }

  onTouchUsername(e) {
    e.preventDefault();
    const { touched } = this.state;
    touched.username = true;
    this.setState({
      touched,
    });
  }

  onTouchPassword(e) {
    e.preventDefault();
    const { touched } = this.state;
    touched.password = true;
    this.setState({
      touched,
    });
  }

  onTouchConfirmPassword(e) {
    e.preventDefault();
    const { touched } = this.state;
    touched.confirmPassword = true;
    this.setState({
      touched,
    });
  }

  onTouchEmail(e) {
    e.preventDefault();
    const { touched } = this.state;
    touched.email = true;
    this.setState({
      touched,
    });
  }

  onSubmitLogin(e) {
    const {
      loginEmail,
      loginPassword,
    } = this.state;
    this.setState({
      error: '',
      loginPending: true,
    });
    e.preventDefault();
    ipcRenderer.send('login-auth', loginEmail, loginPassword);
  }

  onSubmitSignup(e) {
    const {
      email,
      password,
      username,
    } = this.state;
    this.setState({
      error: '',
      signupPending: true,
    });
    e.preventDefault();
    ipcRenderer.send('signup-auth', username, email, password);
  }

  onSubmitResendEmail(e) {
    e.preventDefault();
    this.setState({
      emailResent: false,
      sendingEmail: true,
    });
    e.preventDefault();
    ipcRenderer.send('resend-email-auth');
  }

  checkForCapsLock(event) {
    this.capslock = event.getModifierState('CapsLock');
  }

  checkIfFormIsValid() {
    const {
      email,
      errors,
      username,
      password,
      working,
    } = this.state;
    if ((!working.username && !errors.username && username.length > 0)
            && (!working.password && !errors.password && password.length > 0)
            && (!working.password && !errors.password && password.length > 0)
            && (!working.email && !errors.email && email.length > 0)) {
      return true;
    }
    return false;
  }

  usernameCheckListener(_event, _username, available) {
    const { working } = this.state;
    working.username = false;
    const { errors } = this.state;
    if (available) {
      errors.username = null;
    } else {
      errors.username = 'Username Unavailable';
    }
    const formValid = this.checkIfFormIsValid();
    this.setState({
      working,
      errors,
      formValid,
    });
  }

  authEventListener(event, type, success, message) {
    const {
      onClose,
    } = this.props;
    if (type === 'signup') {
      if (!success) {
        this.setState({
          error: message,
          signupPending: false,
        });
      } else {
        this.setState({
          signupSuccess: true,
          signupPending: false,
        });
      }
    } else if (type === 'login') {
      if (!success) {
        this.setState({
          error: message,
          loginPending: false,
        });
      } else {
        onClose();
      }
    }
  }

  emailResentEventListener() {
    this.setState({
      emailResent: true,
      sendingEmail: false,
    });
  }

  validateUsername() {
    const {
      username,
    } = this.state;
    if (username.length >= 3) {
      ipcRenderer.send('check-username', username);
    } else {
      const { working } = this.state;
      working.username = false;
      const { errors } = this.state;
      errors.username = 'Username must be at least 3 characters';
      this.setState({
        working,
        errors,
        formValid: false,
      });
    }
  }

  validateEmail() {
    const { email } = this.state;
    if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)) {
      const { working } = this.state;
      working.email = false;
      const { errors } = this.state;
      errors.email = null;
      const formValid = this.checkIfFormIsValid();
      this.setState({
        working,
        errors,
        formValid,
      });
    } else {
      const { working } = this.state;
      working.email = false;
      const { errors } = this.state;
      errors.email = 'Enter a valid email address';
      this.setState({
        working,
        errors,
        formValid: false,
      });
    }
  }

  validatePassword() {
    const { password } = this.state;
    if (password.length >= 11) {
      const { working } = this.state;
      working.password = false;
      const { errors } = this.state;
      errors.password = null;
      const formValid = this.checkIfFormIsValid();
      this.setState({
        working,
        errors,
        formValid,
      });
    } else {
      const { working } = this.state;
      working.password = false;
      const { errors } = this.state;
      errors.password = 'Password must be at least 11 characters';
      this.setState({
        working,
        errors,
        formValid: false,
      });
    }
  }

  validateConfPassword() {
    const { confirmPassword, password } = this.state;
    if (confirmPassword === password) {
      const { working } = this.state;
      working.confirmPassword = false;
      const { errors } = this.state;
      errors.confirmPassword = null;
      const formValid = this.checkIfFormIsValid();
      this.setState({
        working,
        errors,
        formValid,
      });
    } else {
      const { working } = this.state;
      working.confirmPassword = false;
      const { errors } = this.state;
      errors.confirmPassword = 'Passwords must match';
      this.setState({
        working,
        errors,
        formValid: false,
      });
    }
  }

  render() {
    const {
      confirmPassword,
      dialogTab,
      email,
      emailResent,
      error,
      errors,
      formValid,
      loginEmail,
      loginPassword,
      loginPending,
      password,
      sendingEmail,
      signupPending,
      signupSuccess,
      username,
      working,
    } = this.state;
    const {
      darkMode,
      onClose,
      toggleTab,
    } = this.props;
    function getDialogTabClass() {
      if (process.platform === 'win32') {
        if (dialogTab === 'signup') {
          return 'auth-dialog-content windows';
        }
        return 'auth-dialog-content windows login';
      }
      if (dialogTab === 'signup') {
        return 'auth-dialog-content';
      }
      return 'auth-dialog-content login';
    }
    return (
      <div className="AuthDialog">
        {signupSuccess
          ? (
            <div className={process.platform === 'win32' ? 'auth-dialog-content verify windows' : 'auth-dialog-content verify'}>
              <Row className="auth-dialog-exit">
                <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                  <button type="button" aria-label="close" className="menubar-btn auth-dialog-btn" id="close-btn" onClick={onClose}><i className="fas fa-times" /></button>
                </Col>
              </Row>
              <Row className="auth-dialog-title verify">
                <Col xs={12}>
                  <img key={darkMode} alt="Singularity icon" src={darkMode ? '../img/app_icon_white.png' : '../img/app_icon.png'} className="app-icon" />
                  <h2>Check Your Email</h2>
                </Col>
              </Row>
              <Row>
                <Col xs={12} className="auth-form-terms-message">
                  <p>You&apos;re almost there!</p>
                  <p>
                    We sent an email to
                    {email}
                    . Before you can use your account you&apos;ll need to
                    verify the email address that you provided.
                  </p>
                  <p>
                    Be sure to check your spam box. If you haven&apos;t
                    seen it in the next 5 minutes, hit the link below or
                    log in to SingularityMods.com to request another.
                  </p>
                  <p><div role="button" tabIndex="0" className="signup-link" onClick={this.onSubmitResendEmail} onKeyPress={this.onSubmitResendEmail}>Re-Send Email</div></p>
                </Col>
              </Row>
              <Row>
                <Col xs={12} className="auth-dialog-submit">
                  {sendingEmail
                    ? (
                      <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="resend-email-spinner" id="resend-email-spinner">
                        <span className="sr-only">Loading...</span>
                      </Spinner>
                    )
                    : ''}
                  {emailResent
                    ? (
                      <div className="email-resent-icon-container">
                        <i className="fas fa-check-circle email-resent-icon" />
                      </div>
                    )
                    : ''}
                  <Button
                    className="auth-dialog-button"
                    onClick={onClose}
                  >
                    Sounds Good
                  </Button>
                </Col>
              </Row>
            </div>
          )
          : (
            <div className={getDialogTabClass()}>
              <Row className="auth-dialog-exit">
                <Col xs={{ span: 2, offset: 10 }} className="pull-right">
                  <button aria-label="Close" type="button" className="menubar-btn auth-dialog-btn" id="close-btn" onClick={onClose}><i className="fas fa-times" /></button>
                </Col>
              </Row>
              <Row className={dialogTab === 'signup' ? 'auth-dialog-title' : 'auth-dialog-title login'}>
                <Col xs={12}>
                  <img alt="Singularity logo" key={darkMode} src={darkMode ? '../img/app_icon_white.png' : '../img/app_icon.png'} className="app-icon" />
                  {dialogTab === 'signup'
                    ? <h2>Sign up</h2>
                    : <h2>Log in</h2>}
                </Col>
              </Row>
              <Row className="auth-dialog-select">
                <Col xs={6}>
                  <Tabs
                    id="game-window-menu-tabs"
                    activeKey={dialogTab}
                    onSelect={toggleTab}
                  >
                    <Tab eventKey="login" title="Login" />
                    <Tab eventKey="signup" title="Sign Up" />
                  </Tabs>
                </Col>
              </Row>
              <Row>
                {dialogTab === 'signup'
                  ? (
                    <Col xs={12} className="auth-dialog-form signup">
                      <Form>
                        <FormGroup>
                          <FormControl
                            id="signupUsername"
                            name="username"
                            type="text"
                            placeholder="Username"
                            autoComplete="off"
                            value={username}
                            isValid={!working.username && !errors.username && username.length > 0}
                            isInvalid={!working.username && errors.username && username.length > 0}
                            onClick={this.onTouchUsername}
                            onChange={this.handleChangeUsername}
                            onKeyPress={(event) => {
                              if (event.key === 'Enter') {
                                this.onSubmitSignup(event);
                              }
                            }}
                          />
                          {working.username
                            ? (
                              <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner" id="username-validation-spinner">
                                <span className="sr-only">Loading...</span>
                              </Spinner>
                            )
                            : ''}
                          <Form.Text className="auth-form-error-text" id="signupUsername" muted>
                            {errors.username}
                          </Form.Text>
                          <FormControl
                            id="signupPassword"
                            name="password"
                            type="password"
                            placeholder="Password"
                            autoComplete="off"
                            value={password}
                            isValid={!working.password && !errors.password && password.length > 0}
                            isInvalid={!working.password && errors.password && password.length > 0}
                            onClick={this.onTouchPassword}
                            onChange={this.handleChangePassword}
                            onKeyPress={(event) => {
                              if (event.key === 'Enter') {
                                this.onSubmitSignup(event);
                              }
                            }}
                          />
                          {working.password
                            ? (
                              <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner password" id="password-validation-spinner">
                                <span className="sr-only">Loading...</span>
                              </Spinner>
                            )
                            : ''}
                          <Form.Text className="auth-form-error-text" id="signupPassword" muted>
                            {errors.password}
                          </Form.Text>
                          <FormControl
                            id="signupConfirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirm Password"
                            autoComplete="off"
                            value={confirmPassword}
                            isValid={!working.confirmPassword
                              && !errors.confirmPassword
                              && confirmPassword.length > 0}
                            isInvalid={!working.confirmPassword
                              && errors.confirmPassword
                              && confirmPassword.length > 0}
                            onClick={this.onTouchConfirmPassword}
                            onChange={this.handleChangeConfirmPassword}
                            onKeyPress={(event) => {
                              if (event.key === 'Enter') {
                                this.onSubmitSignup(event);
                              }
                            }}
                          />
                          {working.confirmPassword
                            ? (
                              <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner confirmpassword" id="confirmpassword-validation-spinner">
                                <span className="sr-only">Loading...</span>
                              </Spinner>
                            )
                            : ''}
                          <Form.Text className="auth-form-error-text" id="signupConfirmPassword" muted>
                            {errors.confirmPassword}
                          </Form.Text>
                          <FormControl
                            id="signupEmail"
                            name="email"
                            type="email"
                            placeholder="Email"
                            value={email}
                            isValid={!working.email && !errors.email && email.length > 0}
                            isInvalid={!working.email && errors.email && email.length > 0}
                            onClick={this.onTouchEmail}
                            onChange={this.handleChangeEmail}
                            onKeyPress={(event) => {
                              if (event.key === 'Enter') {
                                this.onSubmitSignup(event);
                              }
                            }}
                          />
                          {working.email
                            ? (
                              <Spinner animation="border" size="sm" variant="dark" role="status" className="signup-validation-spinner email" id="email-validation-spinner">
                                <span className="sr-only">Loading...</span>
                              </Spinner>
                            )
                            : ''}
                          <Form.Text className="auth-form-error-text" id="signupEmail" muted>
                            {errors.email}
                          </Form.Text>
                        </FormGroup>
                      </Form>
                    </Col>
                  )
                  : (
                    <Col xs={12} className="auth-dialog-form login">
                      <Form>
                        <FormGroup>
                          <FormControl
                            id="loginEmail"
                            name="email"
                            type="email"
                            placeholder="Email"
                            value={loginEmail}
                            onChange={this.handleChangeLoginEmail}
                            onKeyPress={(event) => {
                              if (event.key === 'Enter') {
                                this.onSubmitLogin(event);
                              }
                            }}
                          />
                          <Form.Text className="auth-form-error-text" id="loginEmail" muted>
                            {errors.email}
                          </Form.Text>
                          <FormControl
                            id="loginPassword"
                            name="password"
                            type="password"
                            placeholder="Password"
                            autoComplete="off"
                            value={loginPassword}
                            onChange={this.handleChangeLoginPassword}
                            onKeyPress={(event) => {
                              if (event.key === 'Enter') {
                                this.onSubmitLogin(event);
                              }
                            }}
                          />
                          <Form.Text className="auth-form-error-text" id="loginPassword" muted>
                            {errors.loginPassword}
                          </Form.Text>
                        </FormGroup>
                      </Form>
                    </Col>
                  )}

              </Row>
              {dialogTab === 'signup'
                ? (
                  <Row>
                    <Col xs={12} className="auth-form-terms-message">
                      <p>
                        By clicking Sign Up, you are indicating that you
                        have read and acknowledged the
                        <a className="signup-link" href="https://singularitymods.com/Terms" target="_blank" rel="noreferrer">Terms of Service</a>
                        {' '}
                        and
                        <a className="signup-link" href="https://singularitymods.com/Privacy" target="_blank" rel="noreferrer">Privacy Notice</a>
                        .
                      </p>
                    </Col>
                  </Row>
                )
                : ''}
              <Row>
                <Col xs={12} className="auth-form-error">
                  {loginPending || signupPending
                    ? (
                      <Spinner animation="border" size="sm" variant={darkMode ? 'light' : 'dark'} role="status" className="auth-pending-spinner" id="auth-pending-spinner">
                        <span className="sr-only">Loading...</span>
                      </Spinner>
                    )
                    : ''}
                  {error}
                </Col>
              </Row>
              <Row>
                {dialogTab === 'signup'
                  ? (
                    <Col xs={12} className="auth-dialog-submit">
                      <Button
                        disabled={!formValid}
                        className="auth-dialog-button"
                        onClick={this.onSubmitSignup}
                      >
                        Sign Up
                      </Button>
                    </Col>
                  )
                  : (
                    <Col xs={12} className="auth-dialog-submit">
                      <Button
                        className="auth-dialog-button"
                        onClick={this.onSubmitLogin}
                      >
                        Login
                      </Button>
                    </Col>
                  )}
              </Row>
              {dialogTab === 'login'
                ? (
                  <Row>
                    <Col xs={12} className="auth-form-terms-message forgot-password">
                      <p><a className="signup-link" href="https://singularitymods.com/ResetPassword" target="_blank" rel="noreferrer">Forgot Your Password?</a></p>
                    </Col>
                  </Row>
                )
                : '' }
            </div>
          )}

      </div>
    );
  }
}

AuthDialog.propTypes = {
  authTab: PropTypes.string.isRequired,
  darkMode: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  toggleTab: PropTypes.func.isRequired,
};

export default AuthDialog;
