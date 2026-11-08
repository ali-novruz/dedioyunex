// swift-tools-version: 6.0
// MƏNƏ UYĞUN iOS SDK. NOT COMPILED YET (written on Windows) — see README.md.
import PackageDescription

let package = Package(
    name: "MeneUygun",
    platforms: [.iOS(.v16)],
    products: [
        .library(name: "MeneUygun", targets: ["MeneUygun"]),
    ],
    targets: [
        .target(name: "MeneUygun"),
        .testTarget(name: "MeneUygunTests", dependencies: ["MeneUygun"]),
    ]
)
