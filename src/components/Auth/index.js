import axios from 'axios';


export default class Auth {

    constructor() {
        this.isRefreshing = false;
        this.setSession = this.setSession.bind(this);
        this.register = this.register.bind(this);
        this.ligin = this.login.bind(this);
        this.logout = this.logout.bind(this);
        this.refresh = this.refresh.bind(this);
        this.resendEmail = this.resendEmail.bind(this);
        this.isAuthenticated = this.isAuthenticated.bind(this);
        let isAuth = this.isAuthenticated();
        if (!this.isRefreshing) {
            this.refresh()
            .then( result => {
                if(!isAuth) {
                    window.location.reload(false);
                }
            })
            .catch( err => {
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('id_token');
                sessionStorage.removeItem('expires_at');
                sessionStorage.removeItem('refresh_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('remember_user');
            })
        }      
    }

    userProfile;
/*
  login() {
    this.lock.show();
  }

  handleAuthentication() {
    this.lock.on('authenticated', this.setSession.bind(this));
    this.lock.on('authorization_error', (err) => {
      console.log(err);
    });
  }*/

    register(username,email,password) {
        return new Promise( (resolve,reject) => {
            var postData = {
                username: username,
                email: email,
                password: password
            }
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8'}
            };
            axios.post(`https://id.singularitymods.com/register`,postData, axiosConfig)
            .then(res => {
                if (res.status === 200) {
                    if (res.data.auth) {
                        this.setSession(res.data, false);
                        return resolve({success:true})
                    } else {
                        return resolve({success:false, error: res.data.message})
                    }                  
                } else {
                    return reject({success: false, error: 'Error with request, contact support!'})
                }
            })
            .catch((err) => {
                return reject({success:false, error: 'Error with request, contact support!'})
            })
        })
    }

    login(email,password,remember) {
        return new Promise( (resolve,reject) => {
            var postData = {
                email: email,
                password: password
            };
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8'}
            };
            axios.post(`https://id.singularitymods.com/login`,postData, axiosConfig)
            .then(res => {
                if (res.status === 200) {
                    if (res.data.auth) {
                        this.setSession(res.data, remember);
                        return resolve({success:true})
                    } else {
                        return reject({success:false,message:res.data.message})
                    }              
                } else {
                    return reject({success: false,message:'Site error, contact support!'})
                }
            })
            .catch((err) => {
                return reject({success: false,message:'Site error, contact support!'})
            })
        })
    }

    resendEmail(retry=false) {
        return new Promise( (resolve, reject) => {
            var access_token = sessionStorage.getItem('access_token');
            if (!access_token) {
                return reject({'message': "It doesn't look like you are logged in"})
            }
            var postData = {};
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'x-auth':access_token}
            };
            axios.post(`https://id.singularitymods.com/resendemail`,postData, axiosConfig)
            .then(res => {
                if (res.status === 200) {
                    return resolve(res.data)
                } else if (res.status === 403) {
                    this.refresh()
                    .then( refreshRes => {
                        if (!retry) {
                            this.resendEmail(true)
                            .then(result => {
                                if (result.status === 200) {
                                    return resolve(result.data)
                                }
                                return reject({success:false,message:result.data.message})  
                            })
                        } else {
                            return reject({success: false, message: "Your session expired, log back in"})
                        }
                    })
                    .catch( refreshErr => {
                        reject({success: false, message: 'Error refreshing authentication session'})
                    })
                }
                return reject({success:false,message:res.data.message})                   
                
            })
            .catch((err) => {
                return reject({success:false, message:'Critical error in token refresh'})
            })
        })
    }

    getProfile(retry=false) {
        return new Promise( (resolve, reject) => {
            var access_token = sessionStorage.getItem('access_token');
            if (!access_token) {
                return reject({'message': "It doesn't look like you are logged in"})
            }
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'x-auth':access_token}
            };
            axios.get(`https://id.singularitymods.com/profile`, axiosConfig)
            .then(res => {
                if (res.status === 200) {
                    return resolve(res.data)
                } else if (res.status === 403) {
                    this.refresh()
                    .then( refreshRes => {
                        if (!retry) {
                            this.getPRofile(true)
                            .then(result => {
                                if (result.status === 200) {
                                    return resolve(result.data)
                                }
                                return reject({success:false,message:result.data.message})  
                            })
                        } else {
                            return reject({success: false, message: "Your session expired, log back in"})
                        }
                    })
                    .catch( refreshErr => {
                        reject({success: false, message: 'Error refreshing authentication session'})
                    })       
                } else {
                    return reject({success:false,message:res.data.message})                   
                }
            })
            .catch((err) => {
                return reject({success:false, message:'Critical error in token refresh'})
            })
        })
    }

    refresh() {
        return new Promise( (resolve, reject) => {
            if (this.isRefreshing) {
                return reject({'message': 'Already refreshing token'})
            }
            this.isRefreshing = true;
            var refresh_token = sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token');
            if (!refresh_token) {
                this.isRefreshing = false;
                return reject({'message': 'No refresh token'})
            }
            var postData = {
                refresh_token: refresh_token
            };
            let axiosConfig = {
                headers: {
                'Content-Type': 'application/json;charset=UTF-8'}
            };
            axios.post(`https://id.singularitymods.com/refresh`,postData, axiosConfig)
            .then(res => {
                if (res.status === 200) {
                    this.setSession(res.data, localStorage.getItem('remember_user') == 'true' );
                    this.isRefreshing = false;
                    return resolve({success:true})
                } else {
                    this.isRefreshing = false;
                    return reject({success:false,message:res.data.message})                   
                }
            })
            .catch((err) => {
                this.isRefreshing = false;
                return reject({success:false, message:'Critical error in token refresh'})
            })
        })
    }


  setSession(authResult,remember) {
    if (authResult && authResult.access_token && authResult.id_token && authResult.refresh_token) {
      let expires_at = JSON.stringify((authResult.expires_in * 1000) + new Date().getTime());
      sessionStorage.setItem('access_token', authResult.access_token);
      sessionStorage.setItem('id_token', authResult.id_token);
      sessionStorage.setItem('expires_at', expires_at);
      sessionStorage.setItem('refresh_token', authResult.refresh_token)
      if (remember) {
        localStorage.setItem('refresh_token', authResult.refresh_token)
        localStorage.setItem('remember_user', true);
      }
    }
  }

  logout() {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('id_token');
    sessionStorage.removeItem('expires_at');
    sessionStorage.removeItem('refresh_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('remember_user');
    window.location.reload(false);
  }

  isAuthenticated() {
    if (sessionStorage.getItem("access_token") != null) {
        return true;
    }
    return false;
  }

  getAccessToken() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      throw new Error('No Access Token found');
    }
    return accessToken;
  }

  getIdToken() {
    const idToken = localStorage.getItem('id_token');
    if (!idToken) {
      throw new Error('No Id Token found');
    }
    return idToken;
  }
}