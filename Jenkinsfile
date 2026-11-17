// AUDITO AI - CI/CD pipeline: test -> build check -> deploy to EC2 (https://auditoai.online)
//
// One-time Jenkins setup (see docs/JENKINS_SETUP.md):
//   1. Plugins: Pipeline, Git, SSH Agent.
//   2. Credential (kind "SSH Username with private key") with ID: audito-ec2-ssh
//      -> the key/user you use to ssh into the EC2 instance.
//   3. Create a Pipeline job from this repo (Pipeline script from SCM, path "Jenkinsfile").
//   4. The agent running this job needs: git, ssh, tar, python3, node 20+/npm.
//
// Safety rules baked in (from the production runbook):
//   - env/ (secrets) and docker-compose.yml are NEVER overwritten on the server.
//   - Only the frontend + backend images are rebuilt/restarted; Postgres, Redis, Qdrant untouched.
//   - `docker compose pull` is never run (it would replace local images with old registry ones).
//   - Current images are tagged as rollback-<build> before every deploy and restored if the
//     health check fails.

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 40, unit: 'MINUTES')
  }

  parameters {
    string(name: 'EC2_HOST', defaultValue: '13.49.197.6', description: 'EC2 public IP or DNS of the production server')
    string(name: 'EC2_USER', defaultValue: 'ubuntu', description: 'SSH user on the server (ubuntu / ec2-user)')
    string(name: 'DEPLOY_DIR', defaultValue: '/home/ubuntu/AUDITO_prod_snapshot', description: 'Folder on the server that contains docker-compose.yml and env/')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Untick to only run tests + build, without deploying')
  }

  environment {
    SSH_CRED = 'audito-ec2-ssh'
    SSH_OPTS = '-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git log -1 --oneline'
      }
    }

    stage('Backend tests') {
      steps {
        dir('add-ai-backend') {
          sh '''
            python3 -m venv .venv
            . .venv/bin/activate
            pip install -q --upgrade pip
            pip install -q pytest langgraph
            pip install -q -e ../add-ai-core
            PYTHONPATH=".:../add-ai-core" python -m pytest tests/test_chat_workflow.py -q
          '''
        }
      }
    }

    stage('Frontend type-check + build') {
      steps {
        dir('add-ai-frontend') {
          sh '''
            npm ci
            npx tsc --noEmit -p .
            VITE_API_BASE_URL=/ npm run build
          '''
        }
      }
    }

    stage('Deploy to EC2') {
      when { expression { return params.DEPLOY } }
      steps {
        sshagent(credentials: [env.SSH_CRED]) {
          sh '''
            set -e
            REMOTE="${EC2_USER}@${EC2_HOST}"
            STAMP="build-${BUILD_NUMBER}"

            echo "== 1/4 Upload source (without secrets, node_modules, git or build output) =="
            tar --exclude='./.git' --exclude='*/node_modules' --exclude='*/.output' \
                --exclude='*/.venv' --exclude='*/__pycache__' --exclude='./env' \
                --exclude='./docker-compose.yml' --exclude='./docker-compose.local.yml' \
                --exclude='*.zip' --exclude='*.tgz' -czf /tmp/audito-src.tgz .
            scp ${SSH_OPTS} /tmp/audito-src.tgz "${REMOTE}:/tmp/audito-src.tgz"

            echo "== 2/4 Back up, tag rollback images, unpack =="
            ssh ${SSH_OPTS} "${REMOTE}" "set -e; cd '${DEPLOY_DIR}'
              mkdir -p ~/recovery/${STAMP} && cp -r env docker-compose.yml ~/recovery/${STAMP}/
              docker tag harshpaygude/audito-frontend:latest audito-frontend:rollback-${STAMP} || true
              docker tag harshpaygude/audito-backend:latest  audito-backend:rollback-${STAMP} || true
              tar -xzf /tmp/audito-src.tgz -C '${DEPLOY_DIR}'"

            echo "== 3/4 Rebuild + restart ONLY frontend and backend =="
            ssh ${SSH_OPTS} "${REMOTE}" "set -e; cd '${DEPLOY_DIR}'
              docker compose build frontend backend
              docker compose up -d frontend backend"

            echo "== 4/4 Health check (auto-rollback on failure) =="
            ssh ${SSH_OPTS} "${REMOTE}" "cd '${DEPLOY_DIR}'
              ok=0
              for i in \\$(seq 1 30); do
                if curl -fsS http://127.0.0.1:8000/api/health >/dev/null && curl -fsS http://127.0.0.1:8000/ >/dev/null; then ok=1; break; fi
                sleep 5
              done
              if [ \\$ok -ne 1 ]; then
                echo 'Health check FAILED - rolling back'
                docker tag audito-frontend:rollback-${STAMP} harshpaygude/audito-frontend:latest || true
                docker tag audito-backend:rollback-${STAMP}  harshpaygude/audito-backend:latest  || true
                docker compose up -d frontend backend
                exit 1
              fi
              docker compose ps"
          '''
        }
      }
    }

    stage('Verify live site') {
      when { expression { return params.DEPLOY } }
      steps {
        sh '''
          curl -fsS https://auditoai.online/api/health
          curl -fsS -o /dev/null -w "auditoai.online -> HTTP %{http_code}\\n" https://auditoai.online/auth/login
        '''
      }
    }
  }

  post {
    success { echo 'Deployed. Live at https://auditoai.online' }
    failure { echo 'Pipeline failed - production was rolled back if the failure happened during deploy.' }
  }
}
