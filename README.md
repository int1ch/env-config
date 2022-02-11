# env-config
Help build config from configuration files and ENV var.

## suppored formats
config files can be written in `.yaml` | `.env`  | `.json` formats,  package `yaml` and `dotenv` must be installed manualy, if you plan to use them.


## sources
env-config try to find `./config` dir in your package,
and read first 
* default
* development
* testing
* production
* secret
* environment varables after that.

names are written in priority order, default file has the lowest one, environment variables override all.
possible extension are `.json|.yaml|.env`


```
import ConfigReader from '@int1ch/env-config';
const reader = new ConfigReader();

reader.get("SECRET").required().asString();
```

reader provide get method as a proxy to [env-var](https://github.com/evanshortiss/env-var)
with all .default .required .asPort and other methods

[Browse package](https://unpkg.com/browse/@int1ch/env-config/)
