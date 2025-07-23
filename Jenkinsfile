pipeline {
    agent any

    stages {
        stage('Clone Code') {
            steps {
                git credentialsId: 'nazeerbasha949', url: 'https://github.com/nazeerbasha949/Internal-BE1.git', branch: 'main'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Start Server') {
            steps {
                sh 'pm2 delete all || true'
                sh 'pm2 start index.js --name internal-be'
            }
        }
    }
}
