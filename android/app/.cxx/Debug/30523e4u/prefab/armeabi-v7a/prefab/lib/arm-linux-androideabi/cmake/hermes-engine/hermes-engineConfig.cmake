if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/annemoses/.gradle/caches/8.14.1/transforms/641b3fddfc4eb0fbd5b18da8a7b60e73/transformed/hermes-android-0.80.2-debug/prefab/modules/libhermes/libs/android.armeabi-v7a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/annemoses/.gradle/caches/8.14.1/transforms/641b3fddfc4eb0fbd5b18da8a7b60e73/transformed/hermes-android-0.80.2-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

