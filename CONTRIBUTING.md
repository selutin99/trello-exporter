# Contributing

The project is currently developing its specification. Contributions that clarify
the snapshot format, verify Trello API behavior, or identify restoration gaps are
welcome.

Before proposing a feature, read the [specification](docs/SPECIFICATION.md) and
[format draft](docs/SNAPSHOT_FORMAT.md). Describe the user scenario, what data
must survive an export and restore, and any platform limitations. Update both
documents when the proposal changes their shared contract.

Use synthetic data in examples and bug reports. Do not attach real board exports,
private attachments, authentication tokens, or unredacted operation logs.

Implementation proposals should include checks relevant to the behavior they
change. The first implementation must validate the archive format and exercise
export and restore against a disposable Trello board before claiming support.

Contributions are distributed under the project's [MIT license](LICENSE).
