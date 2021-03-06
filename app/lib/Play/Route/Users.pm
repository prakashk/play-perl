package Play::Route::Users;

use Dancer ':syntax';

use Dancer::Plugin::Auth::Twitter;
auth_twitter_init();

use Play::Users;
my $users = Play::Users->new;

get '/auth/twitter' => sub {
    if (not session('twitter_user')) {
        redirect auth_twitter_authenticate_url;
    } else {

        my $twitter_login = session('twitter_user')->{screen_name} or die "no twitter login in twitter_user session field";
        my $user = $users->get_by_twitter_login($twitter_login);
        if ($user) {
            session 'login' => $user->{login};
        }
        redirect "/#register";
    }
};

prefix '/api';

get '/current_user' => sub {

    my $user = {};
    my $login = session('login');
    if ($login) {
        $user = $users->get_by_login($login);
        unless ($user) {
            die "user '$login' not found";
        }
        $user->{registered} = 1;
    }
    else {
        $user->{registered} = 0;
    }

    if (session('twitter_user')) {
        $user->{twitter} = session('twitter_user');
    }

    return $user;
};

# user settings are private; you can't get settings of other users
get '/current_user/settings' => sub {
    my $login = session('login');
    die "not logged in" unless session->{login};
    return $users->get_settings($login);
};

any ['put', 'post'] => '/current_user/settings' => sub {
    die "not logged in" unless session->{login};
    $users->set_settings(
        session->{login} => scalar params()
    );
    return { result => 'ok' };
};

get '/user/:login' => sub {
    my $login = param('login');
    my $user = $users->get_by_login($login);
    unless ($user) {
        die "user '$login' not found";
    }

    return $user;
};

post '/register' => sub {
    if (not session('twitter_user')) {
        return { error => "not authorized" };
    }
    my $twitter_login = session('twitter_user')->{screen_name};
    my $login = param('login') or return { error => 'no login specified' };

    if ($users->get_by_login($login)) {
        return { error => "Already exists" };
    }
    if ($users->get_by_twitter_login($twitter_login)) {
        return { error => "Already bound" };
    }

    # note that race condition is still possible after these checks
    # that's ok, mongodb will throw an exception
    my $user = { login => $login, twitter => { screen_name => $twitter_login } };

    session 'login' => $login;
    $users->add($user);
    return { status => "ok", user => $user };
};

get '/user' => sub {
    return $users->list;
};

post '/logout' => sub {

    session->destroy(session); #FIXME: workaround a buggy Dancer::Session::MongoDB

    return {
        status => 'ok'
    };
};

if ($ENV{DEV_MODE}) {
    get '/fakeuser/:login' => sub {
        my $login = param('login');
        session 'login' => $login;

        my $user = { login => $login };

        unless (param('notwitter')) {
            session 'twitter_user' => { screen_name => $login } unless param('notwitter');
            $user->{twitter} = { screen_name => $login };
        }

        $users->add($user);
        return { status => 'ok', user => $user };
    };
}

true;
