/*global WildRydes _config AmazonCognitoIdentity AWSCognito*/

var WildRydes = window.WildRydes || {};

(function scopeWrapper($) {
    var signinUrl = '/signin.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    if (!(_config.cognito.userPoolId &&
          _config.cognito.userPoolClientId &&
          _config.cognito.region)) {
        $('#noCognitoMessage').show();
        return;
    }

    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    WildRydes.signOut = function signOut() {
        var currentUser = userPool.getCurrentUser();
        if (currentUser) {
            currentUser.signOut();
        }
    };

    WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });

    /*
     * Cognito User Pool functions
     */

    function register(email, password, onSuccess, onFailure) {
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute({
            Name: 'email',
            Value: email
        });

        userPool.signUp(
            email, // 👈 email is the username
            password,
            [attributeEmail],
            null,
            function signUpCallback(err, result) {
                if (err) {
                    console.error("Register Failure:", err);
                    onFailure(err);
                } else {
                    onSuccess(result);
                }
            }
        );
    }

    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: email, // 👈 must be email
            Password: password
        });

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: function (err) {
                console.error("Login Failure:", err);
                onFailure(err);
            }
        });
    }

    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (err) {
                console.error("Verify Failure:", err);
                onFailure(err);
            } else {
                onSuccess(result);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: email, // 👈 keep email as username
            Pool: userPool
        });
    }

    /*
     *  Event Handlers
     */

    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
    });

    function handleSignin(event) {
        event.preventDefault();

        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();

        signin(email, password,
            function signinSuccess() {
                console.log('Successfully Logged In');
                window.location.href = 'ride.html';
            },
            function signinError(err) {
                alert(err.message || JSON.stringify(err));
            }
        );
    }

    function handleRegister(event) {
        event.preventDefault();

        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();

        if (password !== password2) {
            alert('Passwords do not match');
            return;
        }

        register(email, password,
            function registerSuccess(result) {
                var cognitoUser = result.user;
                console.log('User name is ' + cognitoUser.getUsername());
                alert('Registration successful. Please check your email for the verification code.');
                window.location.href = 'verify.html';
            },
            function registerFailure(err) {
                alert(err.message || JSON.stringify(err));
            }
        );
    }

    function handleVerify(event) {
        event.preventDefault();

        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();

        verify(email, code,
            function verifySuccess(result) {
                console.log('Successfully verified: ' + result);
                alert('Verification successful. You will now be redirected to the login page.');
                window.location.href = signinUrl;
            },
            function verifyError(err) {
                alert(err.message || JSON.stringify(err));
            }
        );
    }
}(jQuery));
