while getopts n: flag
do
    case "${flag}" in
        n) network=${OPTARG};;
    esac
done
echo "Running e2e tests on network: $network"
# TODO: configure and run Detox