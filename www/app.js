$(function () {
    pp.app.user = new pp.models.CurrentUser();

    var appView = pp.app.view = new pp.views.App({el: $('#wrap')});

    pp.app.onError = function(model, response) {
        $('#wrap > .container').prepend(
            new pp.views.Error({
                response: response
            }).render().el
        );
    };
    pp.app.user.on("error", pp.app.onError);

    var router = pp.app.router = new (Backbone.Router.extend({
        routes: {
            "": "dashboard",
            "welcome": "welcome",
            "register": "register",
            "auth/twitter": "twitterLogin",
            "quest/add": "questAdd",
            "quest/:id": "questPage",
            "feed": "eventList",
            "players": "userList",
            "player/:login": "anotherDashboard",
            "about": "about",
        },

        // Google Analytics
        initialize: function() {
            return this.bind('all', this._trackPageview);
        },
        _trackPageview: function() {
            var url;
            url = Backbone.history.getFragment();
            return _gaq.push(['_trackPageview', "/" + url]);
        },

        questAdd: function () {
            var view = new pp.views.QuestAdd({ model: new pp.models.Quest() });
            appView.setPageView(view);
            setActiveMenuItem('add-quest');
        },

        questPage: function (id) {
            var view = new pp.views.QuestPage({ model: new pp.models.Quest({ _id: id }) });
            appView.setPageView(view);
        },

        welcome: function () {
            appView.setPageView(new pp.views.Home());
            setActiveMenuItem('home');
        },

        dashboard: function () {
            var dashboard = new pp.views.Dashboard({ model: pp.app.user, current: true });
            appView.setPageView(dashboard);

            // start after setPageView, because dashboard can call back to router,
            // and if if happens in he initializer before setPageView, then we show welcome view and then immediately replace it with (empty!) dashboard
            // FIXME - this is ugly :(
            dashboard.start();

            setActiveMenuItem('home');
        },

        anotherDashboard: function (login) {
            var user = new pp.models.AnotherUser({ login: login });
            var view = new pp.views.Dashboard({ model: user });
            view.start();
            user.fetch();
            appView.setPageView(view);
        },

        userList: function () {
            var users = new pp.models.UserCollection();
            var view = new pp.views.UserCollection({ users: users });
            users.fetch();
            appView.setPageView(view);
            setActiveMenuItem('user-list');
        },

        eventList: function () {
            var events = new pp.models.EventCollection();
            var view = new pp.views.EventCollection({ events: events });
            events.fetch();
            appView.setPageView(view);
            setActiveMenuItem('event-list');
        },

        register: function () {
            appView.setPageView(new pp.views.Register());
            setActiveMenuItem('home');
        },

        twitterLogin: function () {
            window.location = '/auth/twitter';
        },

        about: function () {
            appView.setPageView(new pp.views.About());
            setActiveMenuItem('about');
        }
    }))();

    function setActiveMenuItem(selector) {
        appView.$el
            .find('.active')
                .removeClass('active')
                .end()
            .find('.menu-item-' + selector)
                .addClass('active');
    }

    Backbone.history.start({ pushState: true });

    $(document).on("click", "a[href^='/']", function(event) {
        if (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            var url = $(event.currentTarget).attr("href").replace(/^\//, "");
            pp.app.router.navigate(url, { trigger: true });
        }
    });
});
