# Management Console

## NVM

```text
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

## Node.js

```text
nvm install --lts
```

## AWS SAM

### Rename
```bash
mv src/index-sample.js src/index.js
```

### Deployment

**初回デプロイ（ガイド付き）:**
```bash
sam build
sam deploy --guided
```

**S3バケット自動作成:**
```bash
sam build
sam deploy --resolve-s3 --parameter-overrides EC2DomainName=your-ec2-domain.com
```
