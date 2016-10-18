const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const srcDir = path.resolve(__dirname, "src");

module.exports = {
    entry: path.join(srcDir, "bootstrap.ts"),
    devtool: "source-map",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "app.js"
    },
    resolve: {
        extensions: ["", ".ts", ".js"]
    },
    module: {
        loaders: [
            {test: /\.ts$/, loader: "ts"},
            {test: /\.html$/, loader: "html?interpolate"},
            {test: /\.css$/, loader: "style!css"},
            {test: /\.(eot|ttf|woff|woff2|svg)(\?v=.*)?$/, loader: "url"}
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(srcDir, "index.html")
        })
    ]
};
