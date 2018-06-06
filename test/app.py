import json
from flask import Flask, request, jsonify, Response
import time

app = Flask(__name__)

TEST_LOGIN = 'user1'
TEST_PASSWORD = 'qweqweqwe'

TEST_SLEEP_DELAY_IN_LONGEST_PATH = 3

FILES = {
    '/': [
        {
            'k': 'd',
            'n': 'folder1'
        },
        {
            'k': 'd',
            'n': 'folder2'
        }
    ],
    '/folder1': [
        {
            'k': 'f',
            'n': 'file1'
        },
        {
            'k': 'f',
            'n': 'file2'
        },
        {
            'k': 'f',
            'n': 'file3'
        },
        {
            'k': 'f',
            'n': 'file4'
        }
    ],
    '/folder2': [
        {
            'k': 'd',
            'n': 'folder3'
        },
        {
            'k': 'f',
            'n': 'file5'
        },
        {
            'k': 'f',
            'n': 'file6'
        }
    ],
    '/folder2/folder3': [
        {
            'k': 'd',
            'n': 'folder4'
        }
    ],
    '/folder2/folder3/folder4': [
        {
            'k': 'f',
            'n': 'file7'
        },
        {
            'k': 'f',
            'n': 'file8'
        }
    ]
}


@app.route('/', methods=['POST', 'GET'])
def get_file():
    path = request.args.get('q')
    login = request.args.get('l')
    password = request.args.get('p')

    if login != TEST_LOGIN:
        return jsonify([{
            'k': 'e',
            'm': 'bad login'
        }]), 401

    if password != TEST_PASSWORD:
        return jsonify([{
            'k': 'e',
            'm': 'bad password'
        }]), 401

    try:
        ret = FILES[path]

        if path == '/folder2/folder3/folder4':
            time.sleep(TEST_SLEEP_DELAY_IN_LONGEST_PATH)

    except KeyError:
        return [{
            'k': 'e',
            'm': 'invalid path'
        }], 404

    return jsonify(ret), 200

@app.route('/stream', methods=['POST', 'GET'])
def stream():
    string = json.dumps([{'k': 'f', 'n': 'file' + str(i)} for i in range(10**2)])
    def generate():
        for c in string:
            time.sleep(0.01)
            yield c
    return Response(generate(), mimetype='application/json')

if __name__ == '__main__':
    app.run()
