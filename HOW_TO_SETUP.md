# How to setup evalaution

## 1. Prepare the evaluation samples

Locate the audio files as follows:

```bash
$ tree configs/resources/samples
configs/resources/samples
├── method_a
│   └── sample.wav
├── method_b
│   └── sample.wav
└── method_c
    └── sample.wav
```

Note that the filename of each method's sample should be the same.

## 2. Convert to stereo audio

Since webMUSHRA needs stereo audio, we convert the monouranl audio to stereo.

```bash
$ ./bin/convert_mono_to_stereo.sh \
    ./configs/resources/samples \
    ./configs/resources/samples_stereo
```

## 3. Make subset of audio files

If the number of samples are large for a single evalaution, it is better to make subsets.

```bash
$ ./bin/divide_audio_dir.py \
    --seed 777 \
    --num_wavs_in_each_subset 1 \
    ./configs/resources/samples_stereo \
    ./configs/resources/samples_stereo_subset
```

## 3+ (Optional). Make concatenated audio for speaker similarity evalaution.

Since webMUSHRA does not have speaker similarity evaluation interface, we make the concatenated audio and use MOS interface.

```bash
$ ./bin/concat_gt_and_conv_audio.py \
    --beep_wav ./configs/resources/beep_stereo_pad_8khz.wav \
    --gt_wavdir ./configs/resources/samples_stereo_subset/subset_0/method_a \
    --conv_wavdirs ./configs/resources/samples_stereo_subset/subset_0/method_{b,c} \
    --root_outdir ./configs/resources/samples_stereo_subset_concat/subset_0
```

`--beep_wav` is the beep sound which inserted between two audios.

## 4. Generate config

```bash
$ ./bin/generate_config_en.py \
    --sample_audio_path /path/to/sample.wav \
    --seed 777 \
    ./configs/resources/samples_stereo_subset/subset_0 \
    ./configs/naturalness_MOS_sample_subset_0.yaml
```

Here `--sample_audio_path` means the reference audio of real-hueman speech.  
It is better to use the sample which not included in the evalaution subset.

If you want to conduct speaker similarity evaluation, specify `--similarity_root_wav_dir`.

```bash
$ ./bin/generate_config_en.py \
    --similarity_root_wav_dir ./configs/resources/samples_stereo_subset_concat/subset_0 \
    --sample_audio_path /path/to/sample.wav \
    --seed 777 \
    ./configs/resources/samples_stereo_subset/subset_0 \
    ./configs/naturalness_MOS_with_similarity_sample_subset_0.yaml
```

## 5. Launch WebMUSHRA

```bash
$ php -S 0.0.0.0:8888
```

Then access localhost:8888 with your browser.  
If you want to launch the process in the remote server, you can use ssh-tunnel.

```bash
# from your local machine
ssh -L 8888:localhost:8888 <user_id>@<host_address>
```

Then you can access localhost:8888 in your local machine.

You can specify to launch the evaluation with the config via URL:

- `localhost:8888/?config=naturalness_MOS_sample_subset_0.yaml`
