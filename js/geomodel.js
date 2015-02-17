;
(function(exports) {

    Date.prototype.toHourStamp = function(){
        var h = this.getHours();
        return '0'+(h%12)+':00 '+(h>12 ? 'PM' : 'AM');
    }

    /**
     * GeoModel constructor
     *
     * - assumption: when calling geofetch(), model.get('position') will have GPS data before calling .fetch()
     */
    Backbone.GeoModel = Backbone.Model.extend({
        geo: function() {
            var x = $.Deferred(),
                self = this;
            navigator.geolocation.getCurrentPosition(function(position) {
                self.set('position', position, {
                    silent: true
                })
                x.resolve(position);
            }, function(e) {
                x.fail(e)
            }, {
                timeout: 12000, //12s
                maximumAge: 10 * 60 * 1000 //600s, or 10m
            })
            return x;
        },
        geofetch: function() {
            return this.geo().then(this.fetch.bind(this))
        }
    })

    /**
     * WeatherModel
     */
    Backbone.WeatherModel = Backbone.GeoModel.extend({
        url: function() {
            return [
                "https://api.forecast.io/forecast/",
                this.get('access_token'),
                "/",
                this.get("position").coords.latitude,
                ',',
                this.get("position").coords.longitude,
                "?callback=?"
            ].join("")
        }
    })

    /**
     * TemplateView
     * - expects a model, view name, and el as options
     */
    Backbone.TemplateView = Backbone.View.extend({
        cache: {},
        stream: function(url) {
            var x = $.Deferred();
            if (this.cache[url]) {
                x.resolve(cache[url]);
            } else {
                $.get(url).then((function(d) {
                    this.cache[url] = _.template(d);
                    x.resolve(_.template(d));
                }).bind(this));
            }
            return x;
        },
        loadTemplate: function(name) {
            return this.stream('./templates/' + name + '.html');
        },
        initialize: function(options) {
            this.options = options;
            this.model && this.model.on("change", this.render.bind(this));
        },
        render: function() {
            var self = this;
            // console.log( self.model.toJSON() )
            this.loadTemplate(this.options.view || this.view).then(function(fn) {
                self.model && (self.el.innerHTML = fn(self.model.toJSON()));
            })
        }
    })

    /**
     * WeatherView
     * - subclasses TemplateView, adds it's own logic
     */
    Backbone.WeatherView = Backbone.TemplateView.extend({
        el: ".container",
        view: "weather"
    })

    /**
     * WeatherRouter
     */
    Backbone.WeatherRouter = Backbone.Router.extend({
        initialize: function(){
            this.model = new Backbone.WeatherModel({ access_token: "d353c94884828ab143c8633437f899aa" })
            this.view = new Backbone.WeatherView({ model: this.model });
            Backbone.history.start();
        },
        routes: {
            "f/:lat/:lng": "weather",
            "*default": "home"
        },
        home: function(){
            Pace.restart();
            this.model.geofetch();
        },
        weather: function(lat, lng){
            Pace.restart();
            this.model.set({ latitude: lat, longitude: lng });
            this.model.fetch();
        }
    })

})(typeof module === "object" ? module.exports : window);
